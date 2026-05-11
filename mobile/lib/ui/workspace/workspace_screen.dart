import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:file_picker/file_picker.dart';
import 'package:video_player/video_player.dart';
import 'package:chewie/chewie.dart';
import 'package:open_filex/open_filex.dart';
import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:audioplayers/audioplayers.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/chat_models.dart';
import '../../data/services/media_cache_service.dart';
import '../../providers/auth_provider.dart';
import '../../providers/chat_provider.dart';
import '../../providers/gemini_provider.dart';
import '../../providers/theme_provider.dart';
import '../../providers/wallpaper_provider.dart';
import '../../providers/user_provider.dart';

// Simple LRU cache for video controllers to limit memory usage and reuse controllers
class VideoControllerCache {
  final int capacity;
  final Map<String, VideoPlayerController> _videoControllers = {};
  final Map<String, ChewieController> _chewieControllers = {};
  final List<String> _lru = [];

  VideoControllerCache({this.capacity = 10});

  Future<ChewieController?> getController(String path, String? fileId) async {
    final cacheKey = fileId ?? path;
    if (_chewieControllers.containsKey(cacheKey)) {
      _touch(cacheKey);
      return _chewieControllers[cacheKey];
    }

    try {
      String filePath = path;
      if (path.startsWith('http://') || path.startsWith('https://')) {
        final file = await mediaCacheService.cacheManager.getSingleFile(path, key: cacheKey);
        filePath = file.path;
      }

      final videoController = VideoPlayerController.file(File(filePath));
      await videoController.initialize();

      final chewie = ChewieController(
        videoPlayerController: videoController,
        autoPlay: false,
        looping: false,
        showControls: false, // Disable default controls to prevent overflow
        aspectRatio: videoController.value.aspectRatio,
        materialProgressColors: ChewieProgressColors(
          playedColor: AppTheme.indigo600,
          handleColor: AppTheme.indigo600,
          backgroundColor: Colors.grey,
          bufferedColor: Colors.white70,
        ),
      );

      _videoControllers[cacheKey] = videoController;
      _chewieControllers[cacheKey] = chewie;
      _touch(cacheKey);
      _evictIfNeeded();
      return chewie;
    } catch (e) {
      debugPrint('VideoControllerCache: failed to init for $path: $e');
      return null;
    }
  }

  void _touch(String path) {
    _lru.remove(path);
    _lru.insert(0, path);
  }

  void _evictIfNeeded() {
    while (_lru.length > capacity) {
      final last = _lru.removeLast();
      try {
        _chewieControllers[last]?.dispose();
      } catch (_) {}
      try {
        _videoControllers[last]?.dispose();
      } catch (_) {}
      _chewieControllers.remove(last);
      _videoControllers.remove(last);
    }
  }

  void disposeAll() {
    for (final c in _chewieControllers.values) {
      try {
        c.dispose();
      } catch (_) {}
    }
    for (final v in _videoControllers.values) {
      try {
        v.dispose();
      } catch (_) {}
    }
    _chewieControllers.clear();
    _videoControllers.clear();
    _lru.clear();
  }
}

final videoControllerCache = VideoControllerCache(capacity: 10);

class WorkspaceScreen extends ConsumerStatefulWidget {
  const WorkspaceScreen({super.key});

  @override
  ConsumerState<WorkspaceScreen> createState() => _WorkspaceScreenState();
}

class _WorkspaceScreenState extends ConsumerState<WorkspaceScreen> {
  final TextEditingController _messageController = TextEditingController();
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final ImagePicker _picker = ImagePicker();
  bool _isSearching = false;
  String? _editingMessageId;

  late AudioRecorder _audioRecorder;
  bool _isRecording = false;

  @override
  void initState() {
    super.initState();
    _audioRecorder = AudioRecorder();
    _messageController.addListener(() {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(workspaceProvider.notifier).bootstrap();
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _searchController.dispose();
    _scrollController.dispose();
    _audioRecorder.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        0,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  Future<void> _handleSendMessage() async {
    if (_messageController.text.trim().isEmpty) return;

    if (_editingMessageId != null) {
      await ref
          .read(workspaceProvider.notifier)
          .editMessage(_editingMessageId!, _messageController.text);
      setState(() {
        _editingMessageId = null;
      });
    } else {
      await ref
          .read(workspaceProvider.notifier)
          .sendMessage(_messageController.text);
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
    }
    _messageController.clear();
  }

  void _startEditing(Message message) {
    setState(() {
      _editingMessageId = message.id;
      _messageController.text = message.text ?? '';
    });
  }

  void _cancelEditing() {
    setState(() {
      _editingMessageId = null;
      _messageController.clear();
    });
  }

  Future<void> _handlePickFile() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.any,
      );

      if (result != null) {
        PlatformFile file = result.files.first;
        if (file.path != null) {
          await _uploadFileToActiveChannel(
            path: file.path!,
            fileName: file.name,
            fileSize: file.size,
          );
        }
      }
    } catch (e) {
      debugPrint('Error picking file: $e');
    }
  }

  Future<void> _handlePickWallpaper() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
      if (image != null) {
        final croppedFile = await _cropImage(image.path);
        if (croppedFile != null) {
          ref.read(wallpaperProvider.notifier).setWallpaper(croppedFile.path);
        }
      }
    } catch (e) {
      debugPrint('Error picking wallpaper: $e');
    }
  }

  Future<CroppedFile?> _cropImage(String path) async {
    final bool isDark = Theme.of(context).brightness == Brightness.dark;

    return await ImageCropper().cropImage(
      sourcePath: path,
      uiSettings: [
        AndroidUiSettings(
          toolbarTitle: 'Sesuaikan Wallpaper',
          toolbarColor: isDark ? AppTheme.zinc900 : AppTheme.indigo600,
          toolbarWidgetColor: Colors.white,
          initAspectRatio: CropAspectRatioPreset.original,
          lockAspectRatio: false,
          aspectRatioPresets: [
            CropAspectRatioPreset.original,
            CropAspectRatioPreset.square,
            CropAspectRatioPreset.ratio3x2,
            CropAspectRatioPreset.ratio4x3,
            CropAspectRatioPreset.ratio16x9,
          ],
        ),
        IOSUiSettings(
          title: 'Sesuaikan Wallpaper',
          aspectRatioPresets: [
            CropAspectRatioPreset.original,
            CropAspectRatioPreset.square,
            CropAspectRatioPreset.ratio3x2,
            CropAspectRatioPreset.ratio4x3,
            CropAspectRatioPreset.ratio16x9,
          ],
        ),
      ],
    );
  }

  Future<void> _handleCamera(ImageSource source) async {
    try {
      final XFile? photo = await _picker.pickImage(source: source);
      if (photo != null) {
        final file = File(photo.path);
        await _uploadFileToActiveChannel(
          path: photo.path,
          fileName: photo.name,
          fileSize: await file.length(),
        );
      }
    } catch (e) {
      debugPrint('Error taking photo: $e');
    }
  }

  Future<void> _uploadFileToActiveChannel({
    required String path,
    required String fileName,
    required int fileSize,
    String? caption,
  }) async {
    final bytes = await File(path).readAsBytes();
    await ref
        .read(workspaceProvider.notifier)
        .uploadFile(
          fileName: fileName,
          mimeType: _mimeTypeForFileName(fileName),
          fileSize: fileSize,
          contentBase64: base64Encode(bytes),
          caption: caption,
        );
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
  }

  String _mimeTypeForFileName(String fileName) {
    final ext = p.extension(fileName).toLowerCase().replaceFirst('.', '');
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'mp4':
        return 'video/mp4';
      case 'mov':
        return 'video/quicktime';
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }

  void _showAttachmentOptions() {
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppTheme.zinc900 : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _attachmentItem(
                    icon: LucideIcons.file,
                    label: 'Dokumen',
                    color: Colors.blue,
                    onTap: () {
                      Navigator.pop(context);
                      _handlePickFile();
                    },
                    isDark: isDark,
                  ),
                  _attachmentItem(
                    icon: LucideIcons.camera,
                    label: 'Kamera',
                    color: Colors.red,
                    onTap: () {
                      Navigator.pop(context);
                      _handleCamera(ImageSource.camera);
                    },
                    isDark: isDark,
                  ),
                  _attachmentItem(
                    icon: LucideIcons.image,
                    label: 'Galeri',
                    color: Colors.purple,
                    onTap: () {
                      Navigator.pop(context);
                      _handleCamera(ImageSource.gallery);
                    },
                    isDark: isDark,
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _attachmentItem(
                    icon: LucideIcons.headphones,
                    label: 'Audio',
                    color: Colors.orange,
                    onTap: () {
                      Navigator.pop(context);
                      _handlePickFile();
                    },
                    isDark: isDark,
                  ),
                  _attachmentItem(
                    icon: LucideIcons.video,
                    label: 'Video',
                    color: Colors.pink,
                    onTap: () async {
                      Navigator.pop(context);
                      final XFile? video = await _picker.pickVideo(
                        source: ImageSource.camera,
                      );
                      if (video != null) {
                        final file = File(video.path);
                        await _uploadFileToActiveChannel(
                          path: video.path,
                          fileName: video.name,
                          fileSize: await file.length(),
                        );
                      }
                    },
                    isDark: isDark,
                  ),
                  const SizedBox(width: 80),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _attachmentItem({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: color.withOpacity(0.1),
            child: Icon(icon, color: color),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handlePolish() async {
    if (_messageController.text.trim().isEmpty) return;
    final polished = await ref
        .read(geminiProvider.notifier)
        .polishText(_messageController.text);
    if (polished != null) {
      _messageController.text = polished;
    }
  }

  void _showSummary() {
    final messages = ref.read(messagesProvider);
    ref.read(geminiProvider.notifier).summarize(messages);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _SummaryBottomSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final workspaceState = ref.watch(workspaceProvider);
    final messages = ref.watch(filteredMessagesProvider);
    final geminiState = ref.watch(geminiProvider);
    final wallpaper = ref.watch(wallpaperProvider);
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    final activeChannel = workspaceState.activeChannel;
    final activeWorkspace = workspaceState.activeWorkspace;
    final memberCount = workspaceState.activeMembers.length;

    return Scaffold(
      backgroundColor: isDark ? AppTheme.zinc950_bg : Colors.white,
      appBar: AppBar(
        backgroundColor: isDark ? AppTheme.zinc900 : Colors.white,
        title: _isSearching
            ? TextField(
                controller: _searchController,
                autofocus: true,
                style: TextStyle(color: isDark ? Colors.white : Colors.black),
                decoration: InputDecoration(
                  hintText: 'Cari pesan...',
                  border: InputBorder.none,
                  hintStyle: TextStyle(
                    fontSize: 14,
                    color: isDark ? AppTheme.zinc500 : AppTheme.zinc400,
                  ),
                ),
                onChanged: (value) {
                  ref.read(searchQueryProvider.notifier).state = value;
                },
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    activeChannel?.name ?? activeWorkspace?.name ?? 'Workspace',
                    style: TextStyle(
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                  Text(
                    memberCount == 0
                        ? 'Memuat anggota...'
                        : '$memberCount anggota di workspace ini',
                    style: TextStyle(
                      fontSize: 10,
                      color: isDark ? AppTheme.zinc400 : AppTheme.zinc500,
                    ),
                  ),
                ],
              ),
        actions: [
          if (_isSearching)
            IconButton(
              onPressed: () {
                setState(() {
                  _isSearching = false;
                  _searchController.clear();
                  ref.read(searchQueryProvider.notifier).state = '';
                });
              },
              icon: Icon(
                LucideIcons.x,
                color: isDark ? Colors.white : Colors.black,
              ),
            )
          else ...[
            IconButton(
              onPressed: _showSummary,
              icon: const Icon(LucideIcons.sparkles, color: AppTheme.indigo600),
              tooltip: 'Rangkum Diskusi',
            ),
            IconButton(
              onPressed: () {
                setState(() {
                  _isSearching = true;
                });
              },
              icon: Icon(
                LucideIcons.search,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
          ],
          IconButton(
            onPressed: () {},
            icon: Icon(
              LucideIcons.moreVertical,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
        ],
      ),
      drawer: _buildDrawer(isDark),
      body: Container(
        decoration: !wallpaper.isDefault && wallpaper.imagePath != null
            ? BoxDecoration(
                image: DecorationImage(
                  image: FileImage(File(wallpaper.imagePath!)),
                  fit: BoxFit.cover,
                  colorFilter: isDark
                      ? ColorFilter.mode(
                          Colors.black.withOpacity(0.4),
                          BlendMode.darken,
                        )
                      : ColorFilter.mode(
                          Colors.white.withOpacity(0.2),
                          BlendMode.lighten,
                        ),
                ),
              )
            : null,
        child: Column(
          children: [
            if (workspaceState.error != null)
              MaterialBanner(
                backgroundColor: isDark ? AppTheme.zinc900 : AppTheme.indigo50,
                content: Text(
                  workspaceState.error!,
                  style: TextStyle(
                    color: isDark ? Colors.white : AppTheme.zinc900,
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () =>
                        ref.read(workspaceProvider.notifier).bootstrap(),
                    child: const Text('Coba lagi'),
                  ),
                ],
              ),
            Expanded(
              child: workspaceState.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : messages.isEmpty
                  ? Center(
                      child: Text(
                        activeChannel == null
                            ? 'Belum ada channel di workspace ini.'
                            : 'Belum ada pesan di ${activeChannel.name}.',
                        style: TextStyle(
                          color: isDark ? Colors.white70 : AppTheme.zinc500,
                        ),
                      ),
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      reverse: true,
                      padding: const EdgeInsets.all(16),
                      itemCount: messages.length,
                      itemBuilder: (context, index) {
                        final message = messages[index];
                        return _MessageBubble(
                          key: ValueKey(message.id),
                          message: message,
                          onEdit: () => _startEditing(message),
                        );
                      },
                    ),
            ),
            if (_editingMessageId != null)
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                color: isDark
                    ? AppTheme.indigo950.withOpacity(0.3)
                    : AppTheme.indigo50,
                child: Row(
                  children: [
                    const Icon(
                      LucideIcons.edit2,
                      size: 16,
                      color: AppTheme.indigo600,
                    ),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'Mengedit pesan...',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.indigo600,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: _cancelEditing,
                      icon: const Icon(
                        LucideIcons.x,
                        size: 16,
                        color: AppTheme.indigo600,
                      ),
                      constraints: const BoxConstraints(),
                      padding: EdgeInsets.zero,
                    ),
                  ],
                ),
              ),
            _buildInputArea(geminiState.isPolishing, isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawer(bool isDark) {
    final user = ref.watch(userProvider);
    final authUser = ref.watch(authProvider).currentUser;
    final workspaceState = ref.watch(workspaceProvider);
    final activeWorkspace = workspaceState.activeWorkspace;

    return Drawer(
      backgroundColor: isDark ? AppTheme.zinc900 : Colors.white,
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(20, 48, 20, 20),
            decoration: const BoxDecoration(color: AppTheme.indigo950),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'RuangKolaborasi',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  activeWorkspace?.name ?? 'Workspace Tim',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          'WORKSPACE',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppTheme.zinc500 : AppTheme.zinc400,
                          ),
                        ),
                      ),
                      IconButton(
                        tooltip: 'Refresh',
                        onPressed: () =>
                            ref.read(workspaceProvider.notifier).bootstrap(),
                        icon: Icon(
                          LucideIcons.refreshCw,
                          size: 16,
                          color: isDark ? Colors.white70 : AppTheme.zinc700,
                        ),
                      ),
                    ],
                  ),
                ),
                for (final workspace in workspaceState.workspaces)
                  ListTile(
                    leading: CircleAvatar(
                      radius: 14,
                      backgroundColor: AppTheme.indigo600,
                      child: Text(
                        workspace.shortName.isEmpty
                            ? _profileInitials(workspace.name)
                            : workspace.shortName,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    title: Text(
                      workspace.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    selected: workspace.id == workspaceState.activeWorkspaceId,
                    selectedTileColor: isDark
                        ? AppTheme.indigo600.withOpacity(0.2)
                        : AppTheme.indigo50,
                    onTap: () {
                      ref
                          .read(workspaceProvider.notifier)
                          .selectWorkspace(workspace.id);
                      Navigator.pop(context);
                    },
                    onLongPress: () {
                      final currentUser = ref.read(authProvider).currentUser;
                      if (workspace.ownerId == currentUser?.id) {
                        _showDeleteWorkspaceConfirm(workspace, isDark);
                      }
                    },
                  ),
                const Divider(),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          'GROUP CHAT',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppTheme.zinc500 : AppTheme.zinc400,
                          ),
                        ),
                      ),
                      IconButton(
                        tooltip: 'Opsi Grup & Channel',
                        onPressed: () => _showWorkspaceAccessOptions(isDark),
                        icon: Icon(
                          LucideIcons.plus,
                          size: 18,
                          color: isDark ? Colors.white70 : AppTheme.zinc700,
                        ),
                      ),
                    ],
                  ),
                ),
                for (final channel in workspaceState.activeChannels)
                  ListTile(
                    leading: Icon(
                      channel.favorite
                          ? LucideIcons.star
                          : LucideIcons.messageSquare,
                      color: isDark ? Colors.white70 : Colors.black87,
                    ),
                    title: Text(
                      channel.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    subtitle: channel.description.isEmpty
                        ? null
                        : Text(
                            channel.description,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: isDark
                                  ? AppTheme.zinc500
                                  : AppTheme.zinc500,
                            ),
                          ),
                    selected: channel.id == workspaceState.activeChannelId,
                    selectedTileColor: isDark
                        ? AppTheme.indigo600.withOpacity(0.2)
                        : AppTheme.indigo50,
                    onTap: () {
                      ref
                          .read(workspaceProvider.notifier)
                          .selectChannel(channel.id);
                      Navigator.pop(context);
                    },
                  ),
                const Divider(),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: Text(
                    'ANGGOTA WORKSPACE',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppTheme.zinc500 : AppTheme.zinc400,
                    ),
                  ),
                ),
                for (final member in workspaceState.activeMembers)
                  ListTile(
                    leading: _buildMemberAvatar(member, isDark: isDark),
                    title: Text(
                      member.id == authUser?.id ? '${user.name} (Kamu)' : member.fullName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    subtitle: Text(
                      member.role,
                      style: TextStyle(
                        color: isDark ? AppTheme.zinc500 : AppTheme.zinc500,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          _buildProfilePanel(user, isDark),
        ],
      ),
    );
  }

  Widget _buildMemberAvatar(WorkspaceMember member, {required bool isDark}) {
    final authUser = ref.watch(authProvider).currentUser;
    final currentUser = ref.watch(userProvider);
    final bool isMe = member.id == authUser?.id;
    final avatarUrl = isMe ? currentUser.avatarUrl : member.avatarUrl;
    final displayName = isMe ? currentUser.name : member.fullName;
    final UserStatus status = isMe ? currentUser.status : _statusFromMember(member.status);

    ImageProvider? imageProvider;

    if (avatarUrl != null && avatarUrl.isNotEmpty) {
      if (avatarUrl.startsWith('data:image')) {
        try {
          final base64String = avatarUrl.split(',').last;
          imageProvider = MemoryImage(base64Decode(base64String));
        } catch (e) {
          debugPrint('Error decoding base64 member avatar: $e');
        }
      } else {
        imageProvider = CachedNetworkImageProvider(avatarUrl);
      }
    }

    return Stack(
      clipBehavior: Clip.none,
      children: [
        CircleAvatar(
          radius: 14,
          backgroundColor: AppTheme.indigo600,
          backgroundImage: imageProvider,
          child: imageProvider == null
              ? Text(
                  _profileInitials(displayName),
                  style: const TextStyle(
                    fontSize: 10,
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                )
              : null,
        ),
        Positioned(
          right: -1,
          bottom: -1,
          child: _buildStatusBadge(
            status,
            borderColor: isDark ? AppTheme.zinc900 : Colors.white,
            size: 10,
            borderWidth: 2,
          ),
        ),
      ],
    );
  }

  UserStatus _statusFromMember(String status) {
    switch (status) {
      case 'online':
        return UserStatus.online;
      case 'idle':
        return UserStatus.idle;
      case 'dnd':
        return UserStatus.dnd;
      default:
        return UserStatus.invisible;
    }
  }

  Widget _buildStatusBadge(UserStatus status, {
    required Color borderColor,
    double size = 18,
    double borderWidth = 3,
  }) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: _statusColor(status),
        shape: BoxShape.circle,
        border: Border.all(color: borderColor, width: borderWidth),
      ),
      child: status == UserStatus.invisible
          ? Center(
              child: Container(
                width: size / 3,
                height: size / 3,
                decoration: BoxDecoration(
                  color: borderColor,
                  shape: BoxShape.circle,
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildProfilePanel(UserState user, bool isDark) {
    final panelColor = isDark ? AppTheme.zinc800 : AppTheme.zinc100;
    final textColor = isDark ? Colors.white : AppTheme.zinc900;
    final mutedColor = isDark ? AppTheme.zinc400 : AppTheme.zinc600;

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 8, 12),
      decoration: BoxDecoration(
        color: panelColor,
        border: Border(
          top: BorderSide(color: isDark ? AppTheme.zinc700 : AppTheme.zinc200),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: () => _showStatusOptions(isDark),
              child: Padding(
                padding: const EdgeInsets.all(2),
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    _buildProfileAvatar(user, radius: 22),
                    Positioned(
                      right: -1,
                      bottom: -1,
                      child: _buildStatusBadge(
                        user.status,
                        borderColor: panelColor,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: InkWell(
                borderRadius: BorderRadius.circular(8),
                onTap: () => _showStatusOptions(isDark),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        user.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: textColor,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(
                            LucideIcons.messageCircle,
                            size: 13,
                            color: _statusColor(user.status),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              _statusLabel(user.status),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: mutedColor,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            IconButton(
              tooltip: 'Pengaturan',
              onPressed: () => _showSettingsOptions(isDark),
              icon: Icon(
                LucideIcons.settings,
                color: isDark ? AppTheme.zinc300 : AppTheme.zinc700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileAvatar(UserState user, {required double radius}) {
    final photoPath = user.photoPath;
    final avatarUrl = user.avatarUrl;

    ImageProvider? imageProvider;
    if (photoPath != null) {
      imageProvider = FileImage(File(photoPath));
    } else if (avatarUrl != null && avatarUrl.isNotEmpty) {
      if (avatarUrl.startsWith('data:image')) {
        try {
          final base64String = avatarUrl.split(',').last;
          imageProvider = MemoryImage(base64Decode(base64String));
        } catch (e) {
          debugPrint('Error decoding base64 profile photo: $e');
        }
      } else {
        imageProvider = CachedNetworkImageProvider(avatarUrl);
      }
    }

    return CircleAvatar(
      radius: radius,
      backgroundColor: AppTheme.indigo600,
      backgroundImage: imageProvider,
      child: imageProvider == null
          ? Text(
              _profileInitials(user.name),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            )
          : null,
    );
  }

  String _profileInitials(String name) {
    final words = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((word) => word.isNotEmpty)
        .toList();

    if (words.isEmpty) return '?';
    if (words.length == 1) return words.first[0].toUpperCase();

    return '${words[0][0]}${words[1][0]}'.toUpperCase();
  }

  void _showSettingsOptions(bool isDark) {
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppTheme.zinc900 : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                child: Row(
                  children: [
                    Icon(
                      LucideIcons.settings,
                      color: isDark ? Colors.white70 : AppTheme.zinc700,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Pengaturan',
                      style: TextStyle(
                        color: isDark ? Colors.white : Colors.black,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              ListTile(
                leading: Icon(
                  LucideIcons.userCog,
                  color: isDark ? Colors.white70 : AppTheme.indigo600,
                ),
                title: Text(
                  'Edit Profile',
                  style: TextStyle(color: isDark ? Colors.white : Colors.black),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _showEditProfileSheet(isDark);
                },
              ),
              ListTile(
                leading: Icon(
                  isDark ? Icons.light_mode : Icons.dark_mode,
                  color: isDark ? Colors.amber : AppTheme.indigo600,
                ),
                title: Text(
                  isDark ? 'Mode Terang' : 'Mode Gelap',
                  style: TextStyle(color: isDark ? Colors.white : Colors.black),
                ),
                onTap: () {
                  ref.read(themeProvider.notifier).toggleTheme();
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: Icon(
                  LucideIcons.image,
                  color: isDark ? Colors.white70 : AppTheme.indigo600,
                ),
                title: Text(
                  'Ganti Wallpaper',
                  style: TextStyle(color: isDark ? Colors.white : Colors.black),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _handlePickWallpaper();
                },
              ),
              const Divider(),
              ListTile(
                leading: const Icon(LucideIcons.logOut, color: Colors.red),
                title: const Text(
                  'Logout',
                  style: TextStyle(color: Colors.red),
                ),
                onTap: _handleLogout,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showWorkspaceAccessOptions(bool isDark) {
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppTheme.zinc900 : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                child: Row(
                  children: [
                    Icon(
                      LucideIcons.building2,
                      color: isDark ? Colors.white70 : AppTheme.zinc700,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Opsi Grup',
                      style: TextStyle(
                        color: isDark ? Colors.white : Colors.black,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              ListTile(
                leading: const Icon(LucideIcons.messageSquare, color: Colors.blue),
                title: Text(
                  'Buat Channel Baru',
                  style: TextStyle(color: isDark ? Colors.white : Colors.black),
                ),
                subtitle: Text(
                  'Mulai diskusi baru di workspace ini',
                  style: TextStyle(
                    color: isDark ? AppTheme.zinc500 : AppTheme.zinc500,
                    fontSize: 12,
                  ),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _showCreateChannelDialog(isDark);
                },
              ),
              ListTile(
                leading: const Icon(LucideIcons.plusCircle, color: Colors.green),
                title: Text(
                  'Buat Grup Baru',
                  style: TextStyle(color: isDark ? Colors.white : Colors.black),
                ),
                subtitle: Text(
                  'Mulai workspace baru untuk tim kamu',
                  style: TextStyle(
                    color: isDark ? AppTheme.zinc500 : AppTheme.zinc500,
                    fontSize: 12,
                  ),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _showCreateWorkspaceDialog(isDark);
                },
              ),
              ListTile(
                leading: const Icon(LucideIcons.logIn, color: AppTheme.indigo600),
                title: Text(
                  'Join Grup',
                  style: TextStyle(color: isDark ? Colors.white : Colors.black),
                ),
                subtitle: Text(
                  'Gunakan kode invite untuk bergabung',
                  style: TextStyle(
                    color: isDark ? AppTheme.zinc500 : AppTheme.zinc500,
                    fontSize: 12,
                  ),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _showJoinWorkspaceDialog(isDark);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCreateWorkspaceDialog(bool isDark) {
    final nameController = TextEditingController();
    final descController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? AppTheme.zinc900 : Colors.white,
        title: const Text('Buat Grup Baru'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              autofocus: true,
              style: TextStyle(color: isDark ? Colors.white : Colors.black),
              decoration: const InputDecoration(
                hintText: 'Nama grup',
                helperText: 'Contoh: Tim Capstone',
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: descController,
              style: TextStyle(color: isDark ? Colors.white : Colors.black),
              decoration: const InputDecoration(
                hintText: 'Deskripsi (opsional)',
                helperText: 'Grup ini dipakai untuk...',
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.trim().isEmpty) return;
              await ref.read(workspaceProvider.notifier).createWorkspace(
                    nameController.text,
                    descController.text,
                  );
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Buat Grup'),
          ),
        ],
      ),
    );
  }

  void _showJoinWorkspaceDialog(bool isDark) {
    final controller = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? AppTheme.zinc900 : Colors.white,
        title: const Text('Join Grup'),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: TextStyle(
            color: isDark ? Colors.white : Colors.black,
            fontWeight: FontWeight.bold,
          ),
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(
            hintText: 'Masukkan kode invite',
            helperText: 'Contoh: PABP-2026',
          ),
          onChanged: (val) {
            controller.value = controller.value.copyWith(
              text: val.toUpperCase(),
              selection: TextSelection.collapsed(offset: val.length),
            );
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (controller.text.trim().isEmpty) return;
              await ref
                  .read(workspaceProvider.notifier)
                  .joinWorkspace(controller.text);
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Join Grup'),
          ),
        ],
      ),
    );
  }

  void _showDeleteWorkspaceConfirm(Workspace workspace, bool isDark) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? AppTheme.zinc900 : Colors.white,
        title: const Text('Hapus Workspace'),
        content: Text(
          'Apakah kamu yakin ingin menghapus workspace "${workspace.name}"? '
          'Tindakan ini tidak dapat dibatalkan dan semua data di dalamnya akan hilang.',
          style: TextStyle(color: isDark ? Colors.white70 : Colors.black87),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () async {
              await ref
                  .read(workspaceProvider.notifier)
                  .deleteWorkspace(workspace.id);
              if (context.mounted) Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Hapus', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _handleLogout() {
    ref.read(workspaceProvider.notifier).clear();
    ref.read(authProvider.notifier).logout();
    Navigator.pop(context);
    Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
  }

  void _showCreateChannelDialog(bool isDark) {
    final controller = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? AppTheme.zinc900 : Colors.white,
        title: Text(
          'Group chat baru',
          style: TextStyle(color: isDark ? Colors.white : Colors.black),
        ),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: TextStyle(color: isDark ? Colors.white : Colors.black),
          decoration: const InputDecoration(hintText: 'Nama group chat'),
          onSubmitted: (_) async {
            await ref
                .read(workspaceProvider.notifier)
                .createChannel(controller.text);
            if (context.mounted) Navigator.pop(context);
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () async {
              await ref
                  .read(workspaceProvider.notifier)
                  .createChannel(controller.text);
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Buat'),
          ),
        ],
      ),
    );
  }

  void _showEditProfileSheet(bool isDark) {
    final user = ref.read(userProvider);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppTheme.zinc900 : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) =>
          _EditProfileSheet(initialUser: user, isDark: isDark),
    );
  }

  void _showStatusOptions(bool isDark) {
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppTheme.zinc900 : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                child: Row(
                  children: [
                    Text(
                      'Atur Status',
                      style: TextStyle(
                        color: isDark ? Colors.white : Colors.black,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              for (final status in UserStatus.values)
                _buildStatusOption(status, isDark),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusOption(UserStatus status, bool isDark) {
    final currentStatus = ref.watch(userProvider).status;

    return ListTile(
      leading: _buildStatusBadge(
        status,
        borderColor: isDark ? AppTheme.zinc900 : Colors.white,
      ),
      title: Text(
        _statusLabel(status),
        style: TextStyle(color: isDark ? Colors.white : Colors.black),
      ),
      subtitle: Text(
        _statusDescription(status),
        style: TextStyle(color: isDark ? AppTheme.zinc400 : AppTheme.zinc500),
      ),
      trailing: currentStatus == status
          ? const Icon(LucideIcons.check, color: AppTheme.indigo600)
          : null,
      onTap: () {
        ref.read(userProvider.notifier).setStatus(status);
        Navigator.pop(context);
      },
    );
  }

  Color _statusColor(UserStatus status) {
    switch (status) {
      case UserStatus.online:
        return Colors.green;
      case UserStatus.idle:
        return Colors.amber;
      case UserStatus.dnd:
        return Colors.red;
      case UserStatus.invisible:
        return AppTheme.zinc500;
    }
  }

  String _statusLabel(UserStatus status) {
    switch (status) {
      case UserStatus.online:
        return 'Online';
      case UserStatus.idle:
        return 'Idle';
      case UserStatus.dnd:
        return 'Do Not Disturb';
      case UserStatus.invisible:
        return 'Invisible';
    }
  }

  String _statusDescription(UserStatus status) {
    switch (status) {
      case UserStatus.online:
        return 'Kamu terlihat aktif.';
      case UserStatus.idle:
        return 'Kamu sedang tidak aktif sementara.';
      case UserStatus.dnd:
        return 'Notifikasi bisa dianggap tidak mengganggu.';
      case UserStatus.invisible:
        return 'Kamu terlihat offline oleh anggota lain.';
    }
  }

  Future<void> _startRecording() async {
    try {
      if (await _audioRecorder.hasPermission()) {
        final directory = await getApplicationDocumentsDirectory();
        final path = p.join(
          directory.path,
          'audio_${DateTime.now().millisecondsSinceEpoch}.m4a',
        );

        const config = RecordConfig();
        await _audioRecorder.start(config, path: path);

        setState(() {
          _isRecording = true;
        });
      }
    } catch (e) {
      debugPrint('Error starting recording: $e');
    }
  }

  Future<void> _stopRecording() async {
    try {
      final path = await _audioRecorder.stop();
      setState(() {
        _isRecording = false;
      });

      if (path != null) {
        final file = File(path);
        await _uploadFileToActiveChannel(
          path: path,
          fileName: p.basename(path),
          fileSize: await file.length(),
        );
      }
    } catch (e) {
      debugPrint('Error stopping recording: $e');
    }
  }

  Future<void> _cancelRecording() async {
    try {
      await _audioRecorder.stop();
      setState(() {
        _isRecording = false;
      });
    } catch (e) {
      debugPrint('Error cancelling recording: $e');
    }
  }

  Widget _buildInputArea(bool isPolishing, bool isDark) {
    if (_isRecording) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? AppTheme.zinc900 : Colors.white,
          border: Border(
            top: BorderSide(
              color: isDark ? AppTheme.zinc800 : Colors.grey.shade100,
            ),
          ),
        ),
        child: Row(
          children: [
            const Icon(LucideIcons.mic, color: Colors.red),
            const SizedBox(width: 8),
            const Expanded(
              child: Text(
                'Sedang merekam...',
                style: TextStyle(
                  color: Colors.red,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            IconButton(
              onPressed: _cancelRecording,
              icon: const Icon(LucideIcons.trash2, color: AppTheme.zinc500),
            ),
            IconButton(
              onPressed: _stopRecording,
              icon: const Icon(LucideIcons.send, color: AppTheme.indigo600),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.zinc900 : Colors.white,
        border: Border(
          top: BorderSide(
            color: isDark ? AppTheme.zinc800 : Colors.grey.shade100,
          ),
        ),
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: _showAttachmentOptions,
            icon: const Icon(LucideIcons.paperclip, color: AppTheme.zinc500),
          ),
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.zinc800 : AppTheme.zinc50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark ? AppTheme.zinc700 : Colors.grey.shade200,
                ),
              ),
              child: TextField(
                controller: _messageController,
                style: TextStyle(color: isDark ? Colors.white : Colors.black),
                decoration: InputDecoration(
                  hintText: 'Ketik pesan...',
                  hintStyle: TextStyle(
                    color: isDark ? AppTheme.zinc500 : AppTheme.zinc400,
                  ),
                  border: InputBorder.none,
                ),
                maxLines: null,
                onSubmitted: (_) {
                  _handleSendMessage();
                },
              ),
            ),
          ),
          IconButton(
            onPressed: isPolishing ? null : _handlePolish,
            icon: isPolishing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(LucideIcons.sparkles, color: AppTheme.indigo600),
          ),
          if (_messageController.text.trim().isEmpty &&
              _editingMessageId == null)
            IconButton(
              onPressed: _startRecording,
              icon: const Icon(LucideIcons.mic, color: AppTheme.indigo600),
            )
          else
            IconButton(
              onPressed: () {
                _handleSendMessage();
              },
              icon: Icon(
                _editingMessageId != null
                    ? LucideIcons.check
                    : LucideIcons.send,
                color: AppTheme.indigo600,
              ),
            ),
        ],
      ),
    );
  }
}

class _EditProfileSheet extends ConsumerStatefulWidget {
  final UserState initialUser;
  final bool isDark;

  const _EditProfileSheet({required this.initialUser, required this.isDark});

  @override
  ConsumerState<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends ConsumerState<_EditProfileSheet> {
  final ImagePicker _picker = ImagePicker();
  late final TextEditingController _nameController;
  late final TextEditingController _bioController;
  String? _selectedPhotoPath;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialUser.name);
    _bioController = TextEditingController(text: widget.initialUser.bio);
    _selectedPhotoPath = widget.initialUser.photoPath;
    _nameController.addListener(_refreshInitials);
  }

  @override
  void dispose() {
    _nameController.removeListener(_refreshInitials);
    _nameController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  void _refreshInitials() {
    if (mounted && _selectedPhotoPath == null) {
      setState(() {});
    }
  }

  Future<void> _pickProfilePhoto() async {
    final image = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 512,
      maxHeight: 512,
      imageQuality: 75,
    );
    if (!mounted || image == null) return;

    setState(() {
      _selectedPhotoPath = image.path;
    });
  }

  void _saveProfile() {
    FocusScope.of(context).unfocus();
    ref
        .read(userProvider.notifier)
        .updateProfile(
          name: _nameController.text,
          bio: _bioController.text,
          photoPath: _selectedPhotoPath,
        );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final textColor = isDark ? Colors.white : AppTheme.zinc900;
    final fillColor = isDark ? AppTheme.zinc800 : AppTheme.zinc50;
    final borderColor = isDark ? AppTheme.zinc700 : AppTheme.zinc200;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    LucideIcons.userCog,
                    color: isDark ? Colors.white70 : AppTheme.zinc700,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Edit Profile',
                    style: TextStyle(
                      color: textColor,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: Icon(
                      LucideIcons.x,
                      color: isDark ? Colors.white70 : AppTheme.zinc700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Center(
                child: Column(
                  children: [
                    Stack(
                      clipBehavior: Clip.none,
                      children: [
                        CircleAvatar(
                          radius: 42,
                          backgroundColor: AppTheme.indigo600,
                          backgroundImage: _selectedPhotoPath == null
                              ? null
                              : FileImage(File(_selectedPhotoPath!)),
                          child: _selectedPhotoPath == null
                              ? Text(
                                  _profileInitials(_nameController.text),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                  ),
                                )
                              : null,
                        ),
                        Positioned(
                          right: -4,
                          bottom: -4,
                          child: IconButton.filled(
                            style: IconButton.styleFrom(
                              backgroundColor: AppTheme.indigo600,
                              foregroundColor: Colors.white,
                            ),
                            onPressed: _pickProfilePhoto,
                            icon: const Icon(LucideIcons.camera, size: 18),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextButton.icon(
                      onPressed: _pickProfilePhoto,
                      icon: const Icon(LucideIcons.image, size: 16),
                      label: const Text('Ganti Photo Profile'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Nama user',
                style: TextStyle(
                  color: textColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _nameController,
                style: TextStyle(color: textColor),
                decoration: InputDecoration(
                  hintText: 'Nama yang tampil di workspace',
                  hintStyle: TextStyle(
                    color: isDark ? AppTheme.zinc500 : AppTheme.zinc400,
                  ),
                  filled: true,
                  fillColor: fillColor,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: borderColor),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: borderColor),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Bio',
                style: TextStyle(
                  color: textColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _bioController,
                style: TextStyle(color: textColor),
                minLines: 4,
                maxLines: 7,
                textInputAction: TextInputAction.newline,
                keyboardType: TextInputType.multiline,
                decoration: InputDecoration(
                  hintText:
                      'Tulis bio, emote, simbol spesial, atau info singkat kamu...',
                  hintStyle: TextStyle(
                    color: isDark ? AppTheme.zinc500 : AppTheme.zinc400,
                  ),
                  alignLabelWithHint: true,
                  filled: true,
                  fillColor: fillColor,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: borderColor),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: borderColor),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _saveProfile,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.indigo600,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text(
                    'Simpan Profile',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _profileInitials(String name) {
    final words = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((word) => word.isNotEmpty)
        .toList();

    if (words.isEmpty) return '?';
    if (words.length == 1) return words.first[0].toUpperCase();

    return '${words[0][0]}${words[1][0]}'.toUpperCase();
  }
}

class _MessageBubble extends ConsumerWidget {
  final Message message;
  final VoidCallback onEdit;

  const _MessageBubble({super.key, required this.message, required this.onEdit});

  void _showMenu(BuildContext context, WidgetRef ref, bool isMe, bool isDark) {
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppTheme.zinc900 : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isMe &&
                message.type == MessageType.text &&
                !message.isDeletedForEveryone)
              ListTile(
                leading: Icon(
                  LucideIcons.edit2,
                  color: isDark ? Colors.white70 : Colors.black87,
                ),
                title: Text(
                  'Edit Pesan',
                  style: TextStyle(color: isDark ? Colors.white : Colors.black),
                ),
                onTap: () {
                  Navigator.pop(context);
                  onEdit();
                },
              ),
            ListTile(
              leading: Icon(
                LucideIcons.trash2,
                color: isDark ? Colors.white70 : Colors.black87,
              ),
              title: Text(
                'Hapus untuk saya',
                style: TextStyle(color: isDark ? Colors.white : Colors.black),
              ),
              onTap: () {
                ref
                    .read(workspaceProvider.notifier)
                    .deleteMessageForMe(message.id);
                Navigator.pop(context);
              },
            ),
            if (isMe && !message.isDeletedForEveryone)
              ListTile(
                leading: const Icon(LucideIcons.trash, color: Colors.red),
                title: const Text(
                  'Hapus untuk semua orang',
                  style: TextStyle(color: Colors.red),
                ),
                onTap: () {
                  ref
                      .read(workspaceProvider.notifier)
                      .deleteMessageForEveryone(message.id);
                  Navigator.pop(context);
                },
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authUser = ref.watch(authProvider).currentUser;
    final bool isMe = message.senderId == authUser?.id;
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    final currentUser = ref.watch(userProvider);
    final displayName = isMe ? currentUser.name : message.user;
    final avatarText = isMe
        ? _profileInitials(currentUser.name)
        : message.avatar;
    final avatarUrl = isMe ? null : message.avatarUrl;
    final userStatus = isMe ? currentUser.status.toBackendString() : (message.status ?? 'offline');

    if (message.isDeletedForEveryone) {
      return _buildDeletedMessage(isMe, isDark);
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: GestureDetector(
        onLongPress: () => _showMenu(context, ref, isMe, isDark),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
          children: [
            if (!isMe) ...[
              _buildMessageAvatar(
                avatarText: avatarText,
                photoPath: null,
                avatarUrl: avatarUrl,
                status: userStatus,
              ),
              const SizedBox(width: 8),
            ],
            Flexible(
              child: Column(
                crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                children: [
                  if (!isMe)
                    Padding(
                      padding: const EdgeInsets.only(left: 4, bottom: 2),
                      child: Text(
                        displayName,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppTheme.indigo600 : AppTheme.indigo600,
                        ),
                      ),
                    ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: isMe
                          ? AppTheme.indigo600
                          : (isDark ? AppTheme.zinc800 : Colors.white),
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(16),
                        topRight: const Radius.circular(16),
                        bottomLeft: isMe ? const Radius.circular(16) : const Radius.circular(4),
                        bottomRight: isMe ? const Radius.circular(4) : const Radius.circular(16),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 2,
                          offset: const Offset(0, 1),
                        ),
                      ],
                      border: !isMe && !isDark
                          ? Border.all(color: AppTheme.zinc100)
                          : null,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildContent(isMe, context, isDark),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              message.time,
                              style: TextStyle(
                                fontSize: 10,
                                color: isMe
                                    ? Colors.white.withOpacity(0.7)
                                    : (isDark ? AppTheme.zinc500 : AppTheme.zinc400),
                              ),
                            ),
                            if (message.isEdited) ...[
                              const SizedBox(width: 4),
                              Text(
                                '• diedit',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontStyle: FontStyle.italic,
                                  color: isMe
                                      ? Colors.white.withOpacity(0.7)
                                      : (isDark ? AppTheme.zinc500 : AppTheme.zinc400),
                                ),
                              ),
                            ],
                            if (isMe) ...[
                              const SizedBox(width: 4),
                              Icon(
                                Icons.done_all,
                                size: 12,
                                color: Colors.white.withOpacity(0.7),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (isMe) ...[
              const SizedBox(width: 32 + 8), // Match avatar width + gap
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildMessageAvatar({
    required String avatarText,
    required String? photoPath,
    required String? avatarUrl,
    required String status,
  }) {
    Color statusColor;
    switch (status) {
      case 'online':
        statusColor = Colors.green;
        break;
      case 'idle':
        statusColor = Colors.orange;
        break;
      case 'dnd':
        statusColor = Colors.red;
        break;
      default:
        statusColor = Colors.grey;
    }

    ImageProvider? imageProvider;
    if (photoPath != null) {
      imageProvider = FileImage(File(photoPath));
    } else if (avatarUrl != null) {
      if (avatarUrl.startsWith('data:image')) {
        try {
          final base64String = avatarUrl.split(',').last;
          imageProvider = MemoryImage(base64Decode(base64String));
        } catch (e) {
          debugPrint('Error decoding base64 avatar: $e');
        }
      } else {
        imageProvider = CachedNetworkImageProvider(avatarUrl);
      }
    }

    return Stack(
      clipBehavior: Clip.none,
      children: [
        CircleAvatar(
          radius: 16,
          backgroundColor: AppTheme.indigo600,
          backgroundImage: imageProvider,
          child: imageProvider == null
              ? Text(
                  avatarText,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                )
              : null,
        ),
        Positioned(
          right: -1,
          bottom: -1,
          child: Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: statusColor,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
            ),
          ),
        ),
      ],
    );
  }

  String _profileInitials(String name) {
    final words = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((word) => word.isNotEmpty)
        .toList();

    if (words.isEmpty) return '?';
    if (words.length == 1) return words.first[0].toUpperCase();

    return '${words[0][0]}${words[1][0]}'.toUpperCase();
  }

  Widget _buildDeletedMessage(bool isMe, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Align(
        alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: isDark ? AppTheme.zinc800 : AppTheme.zinc100,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark ? AppTheme.zinc700 : AppTheme.zinc200,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                LucideIcons.ban,
                size: 14,
                color: isDark ? AppTheme.zinc500 : AppTheme.zinc400,
              ),
              const SizedBox(width: 8),
              Text(
                'Pesan ini telah dihapus',
                style: TextStyle(
                  color: isDark ? AppTheme.zinc500 : AppTheme.zinc400,
                  fontSize: 12,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent(bool isMe, BuildContext context, bool isDark) {
    switch (message.type) {
      case MessageType.text:
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isMe
                ? AppTheme.indigo600
                : (isDark ? AppTheme.zinc800 : AppTheme.zinc50),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            message.text ?? '',
            style: TextStyle(
              color: isMe
                  ? Colors.white
                  : (isDark ? Colors.white : AppTheme.zinc900),
              fontSize: 14,
            ),
          ),
        );

      case MessageType.image:
        return GestureDetector(
          onTap: () => _showImageViewer(context, message.filePath, message.fileId),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: message.filePath != null
                ? _isNetworkPath(message.filePath!)
                      ? CachedNetworkImage(
                          imageUrl: message.filePath!,
                          cacheKey: message.fileId ?? message.filePath,
                          cacheManager: mediaCacheService.cacheManager,
                          width: 200,
                          height: 200,
                          fit: BoxFit.cover,
                          placeholder: (c, url) => Container(
                            width: 200,
                            height: 200,
                            color: isDark ? AppTheme.zinc800 : AppTheme.zinc100,
                            child: const Center(
                              child: CircularProgressIndicator(),
                            ),
                          ),
                          errorWidget: (c, url, error) => Container(
                            width: 200,
                            height: 200,
                            color: isDark ? AppTheme.zinc800 : AppTheme.zinc100,
                            child: const Icon(LucideIcons.imageOff),
                          ),
                        )
                      : Image.file(
                          File(message.filePath!),
                          width: 200,
                          height: 200,
                          fit: BoxFit.cover,
                        )
                : Container(
                    width: 200,
                    height: 200,
                    color: isDark ? AppTheme.zinc800 : AppTheme.zinc100,
                    child: const Icon(LucideIcons.image),
                  ),
          ),
        );

      case MessageType.video:
        return message.filePath != null
            ? ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: MediaQuery.of(context).size.width * 0.55,
                  maxHeight: 250,
                ),
                child: VideoMessage(
                  filePath: message.filePath!,
                  fileId: message.fileId,
                ),
              )
            : const SizedBox();

      case MessageType.audio:
        return message.filePath != null
            ? ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: MediaQuery.of(context).size.width * 0.55,
                ),
                child: AudioMessage(
                  filePath: message.filePath!,
                  isMe: isMe,
                  fileId: message.fileId,
                ),
              )
            : const SizedBox();

      case MessageType.file:
        return GestureDetector(
          onTap: () => _openFile(context, message.filePath),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isMe
                  ? AppTheme.indigo600
                  : (isDark ? AppTheme.zinc800 : AppTheme.zinc50),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  _getIconForType(message.type),
                  color: isMe ? Colors.white : AppTheme.indigo600,
                ),
                const SizedBox(width: 12),
                Flexible(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        message.fileName ?? 'File',
                        style: TextStyle(
                          color: isMe
                              ? Colors.white
                              : (isDark ? Colors.white : AppTheme.zinc900),
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (message.fileSize != null)
                        Text(
                          message.fileSize!,
                          style: TextStyle(
                            color: isMe
                                ? Colors.white70
                                : (isDark
                                      ? AppTheme.zinc500
                                      : AppTheme.zinc500),
                            fontSize: 11,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
    }
  }

  void _openFile(BuildContext context, String? path) async {
    if (path == null) return;
    if (!context.mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      String localPath = path;
      if (_isNetworkPath(path)) {
        final cacheManager = mediaCacheService.cacheManager;
        final stream = cacheManager.getFileStream(path, withProgress: true);
        double progress = 0.0;
        String? resolvedPath;

        // Show modal progress dialog while downloading
        StreamSubscription? sub;
        if (!context.mounted) return;
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (dialogContext) {
            late StateSetter setStateDialog;
            // start listening after dialog builds to capture setState
            WidgetsBinding.instance.addPostFrameCallback((_) {
              sub = stream.listen((event) {
                if (event.runtimeType.toString().contains('DownloadProgress')) {
                  try {
                    final downloaded = (event as dynamic).downloaded as int?;
                    final total = (event as dynamic).total as int?;
                    if (downloaded != null && total != null && total > 0) {
                      setStateDialog(() {
                        progress = downloaded / total;
                      });
                    }
                  } catch (_) {}
                } else if (event.runtimeType.toString().contains('FileInfo')) {
                  try {
                    resolvedPath = (event as dynamic).file.path as String?;
                  } catch (_) {}
                  // close dialog when file is ready
                  if (dialogContext.mounted) {
                    Future.microtask(() => Navigator.of(dialogContext).pop());
                  }
                }
              });
            });

            return StatefulBuilder(
              builder: (context, setState) {
                setStateDialog = setState;
                return AlertDialog(
                  title: const Text('Mengunduh file'),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      LinearProgressIndicator(value: progress),
                      const SizedBox(height: 12),
                      Text('${(progress * 100).toStringAsFixed(0)}%'),
                    ],
                  ),
                );
              },
            );
          },
        );
        // After dialog closes, cancel listener and get cached file path if needed
        await sub?.cancel();
        if (resolvedPath == null) {
          final file = await cacheManager.getSingleFile(path);
          resolvedPath = file.path;
        }

        localPath = resolvedPath!;
      }

      final result = await OpenFilex.open(localPath);
      if (result.type != ResultType.done) {
        debugPrint('Error opening file: ${result.message}');
      }
    } catch (e) {
      debugPrint('Failed to open file: $e');
      messenger.showSnackBar(SnackBar(content: Text('Gagal membuka file: $e')));
    }
  }

  bool _isNetworkPath(String path) {
    return path.startsWith('http://') || path.startsWith('https://');
  }

  void _showImageViewer(BuildContext context, String? path, String? fileId) {
    if (path == null) return;

    showDialog(
      context: context,
      builder: (context) {
        final widgetImage = _isNetworkPath(path)
            ? CachedNetworkImage(
                imageUrl: path,
                cacheKey: fileId ?? path,
                cacheManager: mediaCacheService.cacheManager,
                fit: BoxFit.contain,
                placeholder: (c, u) =>
                    const Center(child: CircularProgressIndicator()),
                errorWidget: (c, u, e) => const Icon(LucideIcons.imageOff),
              )
            : Image.file(File(path), fit: BoxFit.contain);

        return GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(
            color: Colors.black,
            child: Center(
              child: InteractiveViewer(
                child: widgetImage,
                panEnabled: true,
                boundaryMargin: const EdgeInsets.all(20),
              ),
            ),
          ),
        );
      },
    );
  }

  IconData _getIconForType(MessageType type) {
    switch (type) {
      case MessageType.video:
        return LucideIcons.video;
      case MessageType.audio:
        return LucideIcons.headphones;
      default:
        return LucideIcons.file;
    }
  }
}

class VideoMessage extends StatefulWidget {
  final String filePath;
  final String? fileId;

  const VideoMessage({super.key, required this.filePath, this.fileId});

  @override
  State<VideoMessage> createState() => _VideoMessageState();
}

class _VideoMessageState extends State<VideoMessage>
    with AutomaticKeepAliveClientMixin {
  ChewieController? _chewieController;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _initPlayer();
  }

  Future<void> _initPlayer() async {
    final chewie = await videoControllerCache.getController(widget.filePath, widget.fileId);
    if (chewie != null && mounted) {
      _chewieController = chewie;
      setState(() {});
    }
  }

  @override
  void dispose() {
    // Controllers are managed by VideoControllerCache (LRU). Clear local reference only.
    _chewieController = null;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    if (_chewieController == null ||
        !_chewieController!.videoPlayerController.value.isInitialized) {
      return Container(
        width: 150,
        height: 150,
        decoration: BoxDecoration(
          color: isDark ? AppTheme.zinc800 : Colors.black12,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    final vp = _chewieController!.videoPlayerController;

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Stack(
        alignment: Alignment.center,
        children: [
          AspectRatio(
            aspectRatio: vp.value.aspectRatio,
            child: Chewie(controller: _chewieController!),
          ),
          // Play/pause overlay
          Positioned.fill(
            child: GestureDetector(
              onTap: () async {
                if (vp.value.isPlaying) {
                  await vp.pause();
                } else {
                  await vp.play();
                }
                if (mounted) setState(() {});
              },
              child: Container(
                color: Colors.transparent,
                child: Center(
                  child: vp.value.isPlaying
                      ? const SizedBox.shrink()
                      : Container(
                          decoration: BoxDecoration(
                            color: Colors.black38,
                            shape: BoxShape.circle,
                          ),
                          padding: const EdgeInsets.all(8),
                          child: Icon(
                            LucideIcons.play,
                            color: Colors.white,
                            size: 28,
                          ),
                        ),
                ),
              ),
            ),
          ),
          // Fullscreen button
          Positioned(
            right: 6,
            top: 6,
            child: IconButton(
              onPressed: () {
                try {
                  _chewieController?.enterFullScreen();
                } catch (_) {}
              },
              icon: Icon(LucideIcons.maximize2, color: Colors.white, size: 18),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryBottomSheet extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final geminiState = ref.watch(geminiProvider);
    final bool isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: BoxDecoration(
        color: isDark ? AppTheme.zinc900 : Colors.white,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: isDark ? AppTheme.zinc800 : AppTheme.zinc100,
                ),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(LucideIcons.sparkles, color: AppTheme.indigo600),
                    const SizedBox(width: 8),
                    Text(
                      'Rangkuman Diskusi',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: Icon(
                    LucideIcons.x,
                    color: isDark ? Colors.white70 : Colors.black87,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: geminiState.isSummarizing
                  ? Center(
                      child: Column(
                        children: [
                          const SizedBox(height: 40),
                          const CircularProgressIndicator(),
                          const SizedBox(height: 16),
                          Text(
                            'Gemini sedang membaca histori chat...',
                            style: TextStyle(
                              color: isDark ? Colors.white70 : Colors.black87,
                            ),
                          ),
                        ],
                      ),
                    )
                  : Text(
                      geminiState.summaryResult,
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.white : AppTheme.zinc900,
                        height: 1.5,
                      ),
                    ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.indigo600,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Tutup'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class AudioMessage extends StatefulWidget {
  final String filePath;
  final bool isMe;
  final String? fileId;

  const AudioMessage({
    super.key,
    required this.filePath,
    required this.isMe,
    this.fileId,
  });

  @override
  State<AudioMessage> createState() => _AudioMessageState();
}

class _AudioMessageState extends State<AudioMessage>
    with AutomaticKeepAliveClientMixin {
  late AudioPlayer _audioPlayer;
  bool _isPlaying = false;
  bool _isLoading = false;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;
  double _playbackSpeed = 1.0;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _audioPlayer = AudioPlayer();

    _audioPlayer.onDurationChanged.listen((d) {
      if (mounted) setState(() => _duration = d);
    });

    _audioPlayer.onPositionChanged.listen((p) {
      if (mounted) setState(() => _position = p);
    });

    _audioPlayer.onPlayerStateChanged.listen((state) {
      if (mounted) setState(() => _isPlaying = state == PlayerState.playing);
    });

    _audioPlayer.onPlayerComplete.listen((_) {
      if (mounted) {
        setState(() {
          _isPlaying = false;
          _position = Duration.zero;
        });
      }
    });
  }

  @override
  void dispose() {
    _audioPlayer.dispose();
    super.dispose();
  }

  bool _isNetworkPath(String path) {
    return path.startsWith('http://') || path.startsWith('https://');
  }

  Future<void> _togglePlayback() async {
    if (_isPlaying) {
      await _audioPlayer.pause();
      return;
    }

    try {
      if (_position == Duration.zero || _position >= _duration) {
        if (_isNetworkPath(widget.filePath)) {
          if (mounted) setState(() => _isLoading = true);
          // Use fileId as stable cache key to prevent reload when signed URL changes
          final cacheKey = widget.fileId ?? widget.filePath;
          final file = await mediaCacheService.cacheManager.getSingleFile(widget.filePath, key: cacheKey);
          await _audioPlayer.play(DeviceFileSource(file.path));
        } else {
          await _audioPlayer.play(DeviceFileSource(widget.filePath));
        }
      } else {
        await _audioPlayer.resume();
      }
      await _audioPlayer.setPlaybackRate(_playbackSpeed);
    } catch (e) {
      debugPrint('Failed to play audio: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _toggleSpeed() {
    setState(() {
      if (_playbackSpeed == 1.0) {
        _playbackSpeed = 1.5;
      } else if (_playbackSpeed == 1.5) {
        _playbackSpeed = 2.0;
      } else {
        _playbackSpeed = 1.0;
      }
    });
    _audioPlayer.setPlaybackRate(_playbackSpeed);
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: widget.isMe
            ? AppTheme.indigo600.withOpacity(0.9)
            : (isDark ? AppTheme.zinc800 : AppTheme.zinc100),
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(16),
          topRight: const Radius.circular(16),
          bottomLeft: widget.isMe ? const Radius.circular(16) : Radius.zero,
          bottomRight: widget.isMe ? Radius.zero : const Radius.circular(16),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Stack(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: widget.isMe ? Colors.white24 : AppTheme.indigo600.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: GestureDetector(
                        onTap: _isLoading ? null : _togglePlayback,
                        child: _isLoading
                            ? SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: widget.isMe ? Colors.white : AppTheme.indigo600,
                                ),
                              )
                            : Icon(
                                _isPlaying ? LucideIcons.pause : LucideIcons.play,
                                color: widget.isMe ? Colors.white : AppTheme.indigo600,
                                size: 24,
                              ),
                      ),
                    ),
                  ),
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        color: widget.isMe ? AppTheme.indigo700 : Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        LucideIcons.mic,
                        size: 10,
                        color: widget.isMe ? Colors.white : AppTheme.indigo600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SliderTheme(
                      data: SliderTheme.of(context).copyWith(
                        trackHeight: 2,
                        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 5),
                        overlayShape: const RoundSliderOverlayShape(overlayRadius: 10),
                        activeTrackColor: widget.isMe ? Colors.white : AppTheme.indigo600,
                        inactiveTrackColor: widget.isMe ? Colors.white24 : AppTheme.zinc300,
                        thumbColor: widget.isMe ? Colors.white : AppTheme.indigo600,
                      ),
                      child: Slider(
                        value: _position.inSeconds.toDouble(),
                        max: _duration.inSeconds.toDouble() > 0
                            ? _duration.inSeconds.toDouble()
                            : 1.0,
                        onChanged: (value) async {
                          await _audioPlayer.seek(Duration(seconds: value.toInt()));
                        },
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _formatDuration(_position),
                            style: TextStyle(
                              fontSize: 10,
                              color: widget.isMe ? Colors.white70 : AppTheme.zinc500,
                            ),
                          ),
                          Text(
                            _formatDuration(_duration),
                            style: TextStyle(
                              fontSize: 10,
                              color: widget.isMe ? Colors.white70 : AppTheme.zinc500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 4),
              GestureDetector(
                onTap: _toggleSpeed,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  decoration: BoxDecoration(
                    color: widget.isMe ? Colors.white24 : AppTheme.zinc200,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '${_playbackSpeed.toStringAsFixed(1).replaceAll('.0', '')}x',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: widget.isMe ? Colors.white : AppTheme.zinc700,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, "0");
    String twoDigitMinutes = twoDigits(duration.inMinutes.remainder(60));
    String twoDigitSeconds = twoDigits(duration.inSeconds.remainder(60));
    return "$twoDigitMinutes:$twoDigitSeconds";
  }
}
