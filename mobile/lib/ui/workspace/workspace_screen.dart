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
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:audioplayers/audioplayers.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/chat_models.dart';
import '../../providers/auth_provider.dart';
import '../../providers/chat_provider.dart';
import '../../providers/gemini_provider.dart';
import '../../providers/theme_provider.dart';
import '../../providers/wallpaper_provider.dart';
import '../../providers/user_provider.dart';

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
        _scrollController.position.maxScrollExtent,
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
                      padding: const EdgeInsets.all(16),
                      itemCount: messages.length,
                      itemBuilder: (context, index) {
                        final message = messages[index];
                        return _MessageBubble(
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
                            color: isDark
                                ? AppTheme.zinc500
                                : AppTheme.zinc400,
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
                            color: isDark
                                ? AppTheme.zinc500
                                : AppTheme.zinc400,
                          ),
                        ),
                      ),
                      IconButton(
                        tooltip: 'Tambah group chat',
                        onPressed: () {
                          Navigator.pop(context);
                          _showCreateChannelDialog(isDark);
                        },
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
                    leading: CircleAvatar(
                      radius: 13,
                      backgroundColor: AppTheme.indigo600,
                      child: Text(
                        _profileInitials(member.fullName),
                        style: const TextStyle(
                          fontSize: 10,
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    title: Text(
                      member.fullName,
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

    return CircleAvatar(
      radius: radius,
      backgroundColor: AppTheme.indigo600,
      backgroundImage: photoPath == null ? null : FileImage(File(photoPath)),
      child: photoPath == null
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

  Widget _buildStatusBadge(UserStatus status, {required Color borderColor}) {
    return Container(
      width: 18,
      height: 18,
      decoration: BoxDecoration(
        color: _statusColor(status),
        shape: BoxShape.circle,
        border: Border.all(color: borderColor, width: 3),
      ),
      child: status == UserStatus.invisible
          ? Center(
              child: Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: borderColor,
                  shape: BoxShape.circle,
                ),
              ),
            )
          : null,
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

  Widget _buildDMItem(String name, Color color, bool isDark) {
    return ListTile(
      leading: CircleAvatar(
        radius: 12,
        backgroundColor: color,
        child: Text(
          name[0],
          style: const TextStyle(fontSize: 10, color: Colors.white),
        ),
      ),
      title: Text(
        name,
        style: TextStyle(
          fontSize: 14,
          color: isDark ? Colors.white : Colors.black,
        ),
      ),
      onTap: () => Navigator.pop(context),
    );
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
    final image = await _picker.pickImage(source: ImageSource.gallery);
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

  const _MessageBubble({required this.message, required this.onEdit});

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
    final avatarPhotoPath = isMe ? currentUser.photoPath : null;

    if (message.isDeletedForEveryone) {
      return _buildDeletedMessage(isMe, isDark);
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: GestureDetector(
        onLongPress: () => _showMenu(context, ref, isMe, isDark),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!isMe)
              _buildMessageAvatar(
                avatarText: avatarText,
                photoPath: avatarPhotoPath,
              ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: isMe
                    ? CrossAxisAlignment.end
                    : CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: isMe
                        ? MainAxisAlignment.end
                        : MainAxisAlignment.start,
                    children: [
                      Text(
                        displayName,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        message.time,
                        style: TextStyle(
                          color: isDark ? AppTheme.zinc500 : AppTheme.zinc400,
                          fontSize: 11,
                        ),
                      ),
                      if (message.isEdited) ...[
                        const SizedBox(width: 4),
                        Text(
                          '(diedit)',
                          style: TextStyle(
                            color: isDark ? AppTheme.zinc500 : AppTheme.zinc400,
                            fontSize: 10,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  _buildContent(isMe, context, isDark),
                ],
              ),
            ),
            if (isMe) const SizedBox(width: 12),
            if (isMe)
              _buildMessageAvatar(
                avatarText: avatarText,
                photoPath: avatarPhotoPath,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageAvatar({
    required String avatarText,
    required String? photoPath,
  }) {
    return CircleAvatar(
      radius: 18,
      backgroundColor: AppTheme.indigo600,
      backgroundImage: photoPath == null ? null : FileImage(File(photoPath)),
      child: photoPath == null
          ? Text(
              avatarText,
              style: const TextStyle(color: Colors.white, fontSize: 14),
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
          onTap: () => _openFile(message.filePath),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: message.filePath != null
                ? _isNetworkPath(message.filePath!)
                    ? Image.network(
                        message.filePath!,
                        width: 200,
                        height: 200,
                        fit: BoxFit.cover,
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
            ? Container(
                constraints: const BoxConstraints(
                  maxWidth: 250,
                  maxHeight: 200,
                ),
                child: VideoMessage(filePath: message.filePath!),
              )
            : const SizedBox();
      case MessageType.audio:
        return message.filePath != null
            ? AudioMessage(filePath: message.filePath!, isMe: isMe)
            : const SizedBox();
      case MessageType.file:
        return GestureDetector(
          onTap: () => _openFile(message.filePath),
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

  void _openFile(String? path) async {
    if (path == null) return;
    if (_isNetworkPath(path)) return;
    final result = await OpenFilex.open(path);
    if (result.type != ResultType.done) {
      debugPrint('Error opening file: ${result.message}');
    }
  }

  bool _isNetworkPath(String path) {
    return path.startsWith('http://') || path.startsWith('https://');
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

  const VideoMessage({super.key, required this.filePath});

  @override
  State<VideoMessage> createState() => _VideoMessageState();
}

class _VideoMessageState extends State<VideoMessage> {
  late VideoPlayerController _videoPlayerController;
  ChewieController? _chewieController;

  @override
  void initState() {
    super.initState();
    _initPlayer();
  }

  Future<void> _initPlayer() async {
    _videoPlayerController = VideoPlayerController.file(File(widget.filePath));
    await _videoPlayerController.initialize();
    _chewieController = ChewieController(
      videoPlayerController: _videoPlayerController,
      autoPlay: false,
      looping: false,
      aspectRatio: _videoPlayerController.value.aspectRatio,
      materialProgressColors: ChewieProgressColors(
        playedColor: AppTheme.indigo600,
        handleColor: AppTheme.indigo600,
        backgroundColor: Colors.grey,
        bufferedColor: Colors.white70,
      ),
    );
    setState(() {});
  }

  @override
  void dispose() {
    _videoPlayerController.dispose();
    _chewieController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    return _chewieController != null &&
            _chewieController!.videoPlayerController.value.isInitialized
        ? ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Chewie(controller: _chewieController!),
          )
        : Container(
            width: 200,
            height: 200,
            decoration: BoxDecoration(
              color: isDark ? AppTheme.zinc800 : Colors.black12,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(child: CircularProgressIndicator()),
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

  const AudioMessage({super.key, required this.filePath, required this.isMe});

  @override
  State<AudioMessage> createState() => _AudioMessageState();
}

class _AudioMessageState extends State<AudioMessage> {
  late AudioPlayer _audioPlayer;
  bool _isPlaying = false;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;

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

  Future<void> _togglePlayback() async {
    if (_isPlaying) {
      await _audioPlayer.pause();
    } else {
      await _audioPlayer.play(DeviceFileSource(widget.filePath));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 220,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: widget.isMe
            ? AppTheme.indigo700.withOpacity(0.5)
            : (Theme.of(context).brightness == Brightness.dark
                  ? AppTheme.zinc700
                  : AppTheme.zinc100),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: _togglePlayback,
            icon: Icon(
              _isPlaying ? LucideIcons.pause : LucideIcons.play,
              color: widget.isMe ? Colors.white : AppTheme.indigo600,
            ),
            constraints: const BoxConstraints(),
            padding: EdgeInsets.zero,
          ),
          Expanded(
            child: SliderTheme(
              data: SliderTheme.of(context).copyWith(
                trackHeight: 2,
                thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                overlayShape: const RoundSliderOverlayShape(overlayRadius: 12),
              ),
              child: Slider(
                value: _position.inSeconds.toDouble(),
                max: _duration.inSeconds.toDouble() > 0
                    ? _duration.inSeconds.toDouble()
                    : 1.0,
                onChanged: (value) async {
                  await _audioPlayer.seek(Duration(seconds: value.toInt()));
                },
                activeColor: widget.isMe ? Colors.white : AppTheme.indigo600,
                inactiveColor: widget.isMe
                    ? Colors.white24
                    : Colors.grey.shade300,
              ),
            ),
          ),
          Text(
            _formatDuration(_isPlaying ? _position : _duration),
            style: TextStyle(
              fontSize: 10,
              color: widget.isMe ? Colors.white70 : AppTheme.zinc500,
            ),
          ),
          const SizedBox(width: 4),
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
