import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../data/models/chat_models.dart';
import '../data/services/backend_service.dart';
import '../data/services/media_cache_service.dart';
import 'auth_provider.dart';
import 'user_provider.dart';

class WorkspaceState {
  final bool isLoading;
  final bool isSending;
  final String? error;
  final List<Workspace> workspaces;
  final Map<String, List<Channel>> channelsByWorkspace;
  final Map<String, Map<String, List<Message>>> messagesByWorkspace;
  final Map<String, List<WorkspaceMember>> membersByWorkspace;
  final String? activeWorkspaceId;
  final String? activeChannelId;
  final Set<String> hiddenMessageIds;

  const WorkspaceState({
    this.isLoading = false,
    this.isSending = false,
    this.error,
    this.workspaces = const [],
    this.channelsByWorkspace = const {},
    this.messagesByWorkspace = const {},
    this.membersByWorkspace = const {},
    this.activeWorkspaceId,
    this.activeChannelId,
    this.hiddenMessageIds = const {},
  });

  Workspace? get activeWorkspace {
    for (final workspace in workspaces) {
      if (workspace.id == activeWorkspaceId) return workspace;
    }
    return workspaces.isEmpty ? null : workspaces.first;
  }

  List<Channel> get activeChannels {
    final workspaceId = activeWorkspace?.id;
    if (workspaceId == null) return const [];
    return channelsByWorkspace[workspaceId] ?? const [];
  }

  Channel? get activeChannel {
    for (final channel in activeChannels) {
      if (channel.id == activeChannelId) return channel;
    }
    return activeChannels.isEmpty ? null : activeChannels.first;
  }

  List<WorkspaceMember> get activeMembers {
    final workspaceId = activeWorkspace?.id;
    if (workspaceId == null) return const [];
    return membersByWorkspace[workspaceId] ?? const [];
  }

  List<Message> get activeMessages {
    final workspaceId = activeWorkspace?.id;
    final channelId = activeChannel?.id;
    if (workspaceId == null || channelId == null) return const [];

    final messages = (messagesByWorkspace[workspaceId]?[channelId] ?? const [])
        .where((message) => !hiddenMessageIds.contains(message.id))
        .toList();
    
    // Sort by ID or timestamp to ensure newest is first, or just reverse if backend returns chronological
    return messages.reversed.toList();
  }

  WorkspaceState copyWith({
    bool? isLoading,
    bool? isSending,
    String? error,
    bool clearError = false,
    List<Workspace>? workspaces,
    Map<String, List<Channel>>? channelsByWorkspace,
    Map<String, Map<String, List<Message>>>? messagesByWorkspace,
    Map<String, List<WorkspaceMember>>? membersByWorkspace,
    String? activeWorkspaceId,
    String? activeChannelId,
    Set<String>? hiddenMessageIds,
  }) {
    return WorkspaceState(
      isLoading: isLoading ?? this.isLoading,
      isSending: isSending ?? this.isSending,
      error: clearError ? null : error ?? this.error,
      workspaces: workspaces ?? this.workspaces,
      channelsByWorkspace: channelsByWorkspace ?? this.channelsByWorkspace,
      messagesByWorkspace: messagesByWorkspace ?? this.messagesByWorkspace,
      membersByWorkspace: membersByWorkspace ?? this.membersByWorkspace,
      activeWorkspaceId: activeWorkspaceId ?? this.activeWorkspaceId,
      activeChannelId: activeChannelId ?? this.activeChannelId,
      hiddenMessageIds: hiddenMessageIds ?? this.hiddenMessageIds,
    );
  }
}

class WorkspaceNotifier extends StateNotifier<WorkspaceState> {
  WorkspaceNotifier({
    required String accessToken,
    required String? currentUserId,
    required Ref ref,
    BackendService? backendService,
  }) : _accessToken = accessToken,
       _currentUserId = currentUserId,
       _ref = ref,
       _backendService = backendService ?? BackendService(),
       super(const WorkspaceState());

  final BackendService _backendService;
  final Ref _ref;
  String _accessToken;
  String? _currentUserId;
  RealtimeChannel? _realtimeChannel;
  RealtimeChannel? _profilesChannel;
  Timer? _pollTimer;

  @override
  void dispose() {
    _stopListening();
    _stopListeningProfiles();
    super.dispose();
  }

  Future<void> bootstrap() async {
    if (_accessToken.isEmpty) return;

    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final bootstrap = await _backendService.fetchWorkspaceBootstrap(
        accessToken: _accessToken,
      );
      final activeWorkspaceId = bootstrap.workspaces.isNotEmpty
          ? bootstrap.workspaces.first.id
          : null;
      final activeChannelId =
          activeWorkspaceId != null &&
              (bootstrap.channelsByWorkspace[activeWorkspaceId]?.isNotEmpty ??
                  false)
          ? bootstrap.channelsByWorkspace[activeWorkspaceId]!.first.id
          : null;

      state = WorkspaceState(
        workspaces: bootstrap.workspaces,
        channelsByWorkspace: bootstrap.channelsByWorkspace,
        messagesByWorkspace: bootstrap.messagesByWorkspace,
        membersByWorkspace: bootstrap.membersByWorkspace,
        activeWorkspaceId: activeWorkspaceId,
        activeChannelId: activeChannelId,
      );

      // Pre-cache media for all messages from bootstrap
      for (final workspaceEntry in bootstrap.messagesByWorkspace.values) {
        for (final channelMessages in workspaceEntry.values) {
          for (final message in channelMessages) {
            mediaCacheService.precacheMessage(message);
          }
        }
      }

      print(
        'Workspace bootstrap completed. activeWorkspaceId=$activeWorkspaceId activeChannelId=$activeChannelId accessTokenPresent=${_accessToken.isNotEmpty}',
      );

      if (activeChannelId != null) {
        _startListening(activeChannelId);
      }
      _startListeningProfiles();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _cleanError(e));
    }
  }

  void updateAuth(String accessToken, String? userId) {
    _accessToken = accessToken;
    _currentUserId = userId;
  }

  void selectWorkspace(String workspaceId) {
    final channels =
        state.channelsByWorkspace[workspaceId] ?? const <Channel>[];
    final channelId = channels.isEmpty ? null : channels.first.id;

    state = state.copyWith(
      activeWorkspaceId: workspaceId,
      activeChannelId: channelId,
      clearError: true,
    );

    if (channelId != null) {
      _startListening(channelId);
    } else {
      _stopListening();
    }
  }

  void selectChannel(String channelId) {
    state = state.copyWith(activeChannelId: channelId, clearError: true);
    _startListening(channelId);
  }

  void _startListeningProfiles() {
    _stopListeningProfiles();

    try {
      _profilesChannel = Supabase.instance.client
          .channel('public:profiles')
          .onPostgresChanges(
            event: PostgresChangeEvent.update,
            schema: 'public',
            table: 'profiles',
            callback: (payload) {
              if (payload.newRecord.isNotEmpty) {
                _handleProfileUpdate(payload.newRecord);
                print(
                  'Realtime profile payload: ${payload.eventType} new=${payload.newRecord} old=${payload.oldRecord}',
                );
              }
            },
          )
          .subscribe();
      print('Subscribed to profiles realtime channel');
    } catch (e) {
      print('Gagal memulai real-time profil: $e');
    }
  }

  void _stopListeningProfiles() {
    if (_profilesChannel != null) {
      Supabase.instance.client.removeChannel(_profilesChannel!);
      _profilesChannel = null;
    }
  }

  void _handleProfileUpdate(Map<String, dynamic> row) {
    final profileId = row['id'] as String?;
    final status = row['status'] as String?;
    if (profileId == null || status == null) return;

    if (profileId == _currentUserId) {
      final userStatus = _mapBackendStatus(status);
      // Hindari loop jika status sama
      if (_ref.read(userProvider).status != userStatus) {
        _ref.read(userProvider.notifier).setAuthenticatedUserStatus(userStatus);
      }
    }

    final membersByWorkspace = {
      for (final entry in state.membersByWorkspace.entries)
        entry.key: entry.value.map((member) {
          if (member.id == profileId) {
            return member.copyWith(status: status);
          }
          return member;
        }).toList(),
    };

    // Update message sender statuses in real-time
    final messagesByWorkspace = {
      for (final workspaceEntry in state.messagesByWorkspace.entries)
        workspaceEntry.key: {
          for (final channelEntry in workspaceEntry.value.entries)
            channelEntry.key: channelEntry.value.map((msg) {
              if (msg.senderId == profileId) {
                return msg.copyWith(status: status);
              }
              return msg;
            }).toList()
        }
    };

    state = state.copyWith(
      membersByWorkspace: membersByWorkspace,
      messagesByWorkspace: messagesByWorkspace,
    );
  }

  UserStatus _mapBackendStatus(String status) {
    switch (status) {
      case 'online':
        return UserStatus.online;
      case 'idle':
        return UserStatus.idle;
      case 'dnd':
        return UserStatus.dnd;
      case 'offline':
      default:
        return UserStatus.invisible;
    }
  }

  void _startListening(String channelId) {
    _stopListening();
    _stopPolling();

    try {
      _realtimeChannel = Supabase.instance.client
          .channel('public:messages:channel_id=eq.$channelId')
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'messages',
            filter: PostgresChangeFilter(
              type: PostgresChangeFilterType.eq,
              column: 'channel_id',
              value: channelId,
            ),
            callback: (payload) {
              final event = payload.eventType;
              if (event == PostgresChangeEvent.insert ||
                  event == PostgresChangeEvent.update) {
                if (payload.newRecord.isNotEmpty) {
                  print(
                    'Realtime message payload (insert/update) for channel $channelId: ${payload.newRecord}',
                  );
                  _handleRealtimePayload(payload.newRecord);
                }
              } else if (event == PostgresChangeEvent.delete) {
                final id = payload.oldRecord['id'] as String?;
                if (id != null) {
                  _removeMessage(id);
                  print(
                    'Realtime message delete for id=$id on channel $channelId',
                  );
                }
              }
            },
          )
          .subscribe();
      print('Subscribed to messages realtime channel for channelId=$channelId');
      // Start polling as a fallback in case realtime events are not delivered
      _startPolling(channelId);
    } catch (e) {
      print('Gagal memulai real-time: $e');
    }
  }

  void _stopListening() {
    if (_realtimeChannel != null) {
      Supabase.instance.client.removeChannel(_realtimeChannel!);
      _realtimeChannel = null;
      print('Stopped listening to messages realtime channel');
    }
    _stopPolling();
  }

  void _startPolling(String channelId) {
    _stopPolling();

    // Poll every 3 seconds for updates as a fallback when realtime fails
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) async {
      try {
        if (_accessToken.isEmpty) return;
        final bootstrap = await _backendService.fetchWorkspaceBootstrap(
          accessToken: _accessToken,
        );

        final workspaceId = state.activeWorkspaceId;
        if (workspaceId == null) return;

        final workspaceMessages =
            bootstrap.messagesByWorkspace[workspaceId] ?? {};
        final channelMessages = workspaceMessages[channelId] ?? [];

        final messagesByWorkspace = _cloneMessagesByWorkspace();
        messagesByWorkspace.putIfAbsent(workspaceId, () => {});
        messagesByWorkspace[workspaceId]![channelId] = channelMessages;

        state = state.copyWith(messagesByWorkspace: messagesByWorkspace);
      } catch (e) {
        print('Polling error: $e');
      }
    });

    print('Started polling messages for channelId=$channelId');
  }

  void _stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  void _handleRealtimePayload(Map<String, dynamic> row) {
    final workspaceId = state.activeWorkspaceId;
    if (workspaceId == null) return;

    final senderId = row['sender_id'] as String?;
    if (senderId == null) return;

    // Jika ini adalah pesan file/image/video/audio, sebaiknya bootstrap ulang untuk dapat signed URL dsb
    final type = row['type'] as String?;
    if (type == 'file' || type == 'image' || type == 'video' || type == 'audio') {
      bootstrap();
      return;
    }

    // Lookup member untuk mendapatkan nama
    final members = state.membersByWorkspace[workspaceId] ?? [];
    WorkspaceMember? member;
    for (final m in members) {
      if (m.id == senderId) {
        member = m;
        break;
      }
    }

    final displayName = member?.fullName ?? 'Anggota';
    final enrichedRow = {
      ...row,
      'sender_name': senderId == _currentUserId
          ? '$displayName (Kamu)'
          : displayName,
      'sender_status': member?.status ?? 'online',
    };

    final message = Message.fromJson(enrichedRow);
    _upsertMessage(message);
  }

  Future<void> sendMessage(String text) async {
    final channelId = state.activeChannel?.id;
    if (_accessToken.isEmpty || channelId == null || text.trim().isEmpty) {
      return;
    }

    state = state.copyWith(isSending: true, clearError: true);

    try {
      final message = await _backendService.sendChannelMessage(
        accessToken: _accessToken,
        channelId: channelId,
        content: text.trim(),
      );
      _upsertMessage(message);
      state = state.copyWith(isSending: false);
    } catch (e) {
      state = state.copyWith(isSending: false, error: _cleanError(e));
    }
  }

  Future<void> uploadFile({
    required String fileName,
    required String mimeType,
    required int fileSize,
    required String contentBase64,
    String? caption,
  }) async {
    final channelId = state.activeChannel?.id;
    if (_accessToken.isEmpty || channelId == null || contentBase64.isEmpty) {
      return;
    }

    state = state.copyWith(isSending: true, clearError: true);

    try {
      final message = await _backendService.uploadChannelFile(
        accessToken: _accessToken,
        channelId: channelId,
        fileName: fileName,
        mimeType: mimeType,
        fileSize: fileSize,
        contentBase64: contentBase64,
        caption: caption,
      );
      _upsertMessage(message);
      state = state.copyWith(isSending: false);
    } catch (e) {
      state = state.copyWith(isSending: false, error: _cleanError(e));
    }
  }

  Future<void> editMessage(String id, String newText) async {
    if (_accessToken.isEmpty || newText.trim().isEmpty) return;

    state = state.copyWith(isSending: true, clearError: true);

    try {
      final message = await _backendService.updateMessage(
        accessToken: _accessToken,
        messageId: id,
        content: newText.trim(),
      );
      _upsertMessage(message);
      state = state.copyWith(isSending: false);
    } catch (e) {
      state = state.copyWith(isSending: false, error: _cleanError(e));
    }
  }

  void deleteMessageForMe(String id) {
    state = state.copyWith(hiddenMessageIds: {...state.hiddenMessageIds, id});
  }

  Future<void> deleteMessageForEveryone(String id) async {
    if (_accessToken.isEmpty) return;

    state = state.copyWith(isSending: true, clearError: true);

    try {
      await _backendService.deleteMessage(
        accessToken: _accessToken,
        messageId: id,
      );
      _removeMessage(id);
      state = state.copyWith(isSending: false);
    } catch (e) {
      state = state.copyWith(isSending: false, error: _cleanError(e));
    }
  }

  Future<void> joinWorkspace(String inviteCode) async {
    if (_accessToken.isEmpty || inviteCode.trim().isEmpty) return;
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _backendService.joinWorkspace(
        accessToken: _accessToken,
        inviteCode: inviteCode.trim().toUpperCase(),
      );
      await bootstrap();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _cleanError(e));
    }
  }

  Future<void> createWorkspace(String name, String description) async {
    if (_accessToken.isEmpty || name.trim().isEmpty) return;
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _backendService.createWorkspace(
        accessToken: _accessToken,
        name: name.trim(),
        description: description.trim(),
      );
      await bootstrap();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _cleanError(e));
    }
  }

  Future<void> createChannel(String name) async {
    final workspaceId = state.activeWorkspace?.id;
    if (_accessToken.isEmpty || workspaceId == null || name.trim().isEmpty) {
      return;
    }

    state = state.copyWith(isSending: true, clearError: true);

    try {
      final channel = await _backendService.createChannel(
        accessToken: _accessToken,
        workspaceId: workspaceId,
        name: name.trim(),
      );
      final channelsByWorkspace = _cloneChannelsByWorkspace();
      channelsByWorkspace[workspaceId] = [
        ...(channelsByWorkspace[workspaceId] ?? const []),
        channel,
      ];
      final messagesByWorkspace = _cloneMessagesByWorkspace();
      messagesByWorkspace.putIfAbsent(workspaceId, () => {});
      messagesByWorkspace[workspaceId]![channel.id] = [];

      state = state.copyWith(
        isSending: false,
        channelsByWorkspace: channelsByWorkspace,
        messagesByWorkspace: messagesByWorkspace,
        activeChannelId: channel.id,
      );
    } catch (e) {
      state = state.copyWith(isSending: false, error: _cleanError(e));
    }
  }

  Future<void> deleteWorkspace(String workspaceId) async {
    if (_accessToken.isEmpty) return;
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _backendService.deleteWorkspace(
        accessToken: _accessToken,
        workspaceId: workspaceId,
      );
      await bootstrap();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _cleanError(e));
    }
  }

  void clear() {
    _stopListening();
    _stopListeningProfiles();
    state = const WorkspaceState();
  }

  void _upsertMessage(Message message) {
    final workspaceId = state.activeWorkspace?.id;
    final channelId = message.channelId ?? state.activeChannel?.id;
    if (workspaceId == null || channelId == null) return;

    final messagesByWorkspace = _cloneMessagesByWorkspace();
    messagesByWorkspace.putIfAbsent(workspaceId, () => {});
    final messages = [
      ...(messagesByWorkspace[workspaceId]?[channelId] ?? const <Message>[]),
    ];
    final index = messages.indexWhere((item) => item.id == message.id);
    if (index == -1) {
      messages.add(message);
    } else {
      messages[index] = message;
    }
    messagesByWorkspace[workspaceId]![channelId] = messages;

    mediaCacheService.precacheMessage(message);

    state = state.copyWith(messagesByWorkspace: messagesByWorkspace);
  }

  void _removeMessage(String id) {
    final workspaceId = state.activeWorkspace?.id;
    final channelId = state.activeChannel?.id;
    if (workspaceId == null || channelId == null) return;

    final messagesByWorkspace = _cloneMessagesByWorkspace();
    final messages = [
      ...(messagesByWorkspace[workspaceId]?[channelId] ?? const <Message>[]),
    ]..removeWhere((message) => message.id == id);
    messagesByWorkspace[workspaceId]![channelId] = messages;

    state = state.copyWith(messagesByWorkspace: messagesByWorkspace);
  }

  Map<String, List<Channel>> _cloneChannelsByWorkspace() {
    return {
      for (final entry in state.channelsByWorkspace.entries)
        entry.key: [...entry.value],
    };
  }

  Map<String, Map<String, List<Message>>> _cloneMessagesByWorkspace() {
    return {
      for (final workspaceEntry in state.messagesByWorkspace.entries)
        workspaceEntry.key: {
          for (final channelEntry in workspaceEntry.value.entries)
            channelEntry.key: [...channelEntry.value],
        },
    };
  }

  String _cleanError(Object error) {
    final message = error.toString();
    return message.startsWith('Exception: ')
        ? message.substring('Exception: '.length)
        : message;
  }
}

final workspaceProvider =
    StateNotifierProvider<WorkspaceNotifier, WorkspaceState>((ref) {
      final auth = ref.watch(authProvider);
      final accessToken = auth.currentUser?.accessToken ?? '';
      final userId = auth.currentUser?.id;

      final notifier = WorkspaceNotifier(
        accessToken: accessToken,
        currentUserId: userId,
        ref: ref,
      );

      // Update auth info when it changes without recreating the whole notifier
      // though recreating might be safer for state consistency.
      // But for real-time, we want to stay logged in.

      return notifier;
    });

final messagesProvider = Provider<List<Message>>((ref) {
  return ref.watch(workspaceProvider).activeMessages;
});

final searchQueryProvider = StateProvider<String>((ref) => '');

final filteredMessagesProvider = Provider<List<Message>>((ref) {
  final messages = ref.watch(messagesProvider);
  final query = ref.watch(searchQueryProvider).toLowerCase();

  if (query.isEmpty) return messages;

  return messages.where((message) {
    final textMatch = message.text?.toLowerCase().contains(query) ?? false;
    final userMatch = message.user.toLowerCase().contains(query);
    final fileMatch = message.fileName?.toLowerCase().contains(query) ?? false;
    return textMatch || userMatch || fileMatch;
  }).toList();
});
