enum MessageType { text, file, image, video, audio }

class Workspace {
  final String id;
  final String name;
  final String description;
  final String shortName;
  final String color;
  final String ownerId;

  const Workspace({
    required this.id,
    required this.name,
    required this.description,
    required this.shortName,
    required this.color,
    required this.ownerId,
  });

  factory Workspace.fromJson(Map<String, dynamic> json) {
    final name = json['name'] as String? ?? 'Workspace';
    final words = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((word) => word.isNotEmpty)
        .toList();
    final fallbackShortName = words.isEmpty
        ? 'WS'
        : words.take(2).map((word) => word[0]).join().toUpperCase();

    return Workspace(
      id: json['id'] as String? ?? '',
      name: name,
      description: json['description'] as String? ?? '',
      shortName: json['short_name'] as String? ?? fallbackShortName,
      color: json['color'] as String? ?? 'bg-blue-600',
      ownerId: json['owner_id'] as String? ?? '',
    );
  }
}

class Channel {
  final String id;
  final String workspaceId;
  final String name;
  final String description;
  final bool favorite;
  final bool archived;

  const Channel({
    required this.id,
    required this.workspaceId,
    required this.name,
    required this.description,
    this.favorite = false,
    this.archived = false,
  });

  factory Channel.fromJson(Map<String, dynamic> json) {
    return Channel(
      id: json['id'] as String? ?? '',
      workspaceId: json['workspace_id'] as String? ?? '',
      name: json['name'] as String? ?? 'Channel',
      description: json['description'] as String? ?? '',
      favorite: json['favorite'] as bool? ?? false,
      archived: json['archived'] as bool? ?? false,
    );
  }
}

class WorkspaceMember {
  final String id;
  final String workspaceId;
  final String role;
  final String fullName;
  final String? email;
  final String? avatarUrl;
  final String status;

  const WorkspaceMember({
    required this.id,
    required this.workspaceId,
    required this.role,
    required this.fullName,
    this.email,
    this.avatarUrl,
    this.status = 'online',
  });

  WorkspaceMember copyWith({
    String? id,
    String? workspaceId,
    String? role,
    String? fullName,
    String? email,
    String? avatarUrl,
    String? status,
  }) {
    return WorkspaceMember(
      id: id ?? this.id,
      workspaceId: workspaceId ?? this.workspaceId,
      role: role ?? this.role,
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      status: status ?? this.status,
    );
  }

  factory WorkspaceMember.fromJson(Map<String, dynamic> json) {
    return WorkspaceMember(
      id: json['id'] as String? ?? '',
      workspaceId: json['workspace_id'] as String? ?? '',
      role: json['role'] as String? ?? 'member',
      fullName: json['full_name'] as String? ?? 'Anggota',
      email: json['email'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      status: json['profile_status'] as String? ?? 'online',
    );
  }
}

class Message {
  final String id;
  final String? channelId;
  final String? senderId;
  final String user;
  final String avatar;
  final String? avatarUrl;
  final String? status;
  final String time;
  final MessageType type;
  final String? text;
  final String? fileName;
  final String? fileSize;
  final String? filePath; // Path to local file or URL
  final String? fileId;
  final bool isDeletedForEveryone;
  final bool isEdited;

  Message({
    required this.id,
    this.channelId,
    this.senderId,
    required this.user,
    required this.avatar,
    this.avatarUrl,
    this.status,
    required this.time,
    required this.type,
    this.text,
    this.fileName,
    this.fileSize,
    this.filePath,
    this.fileId,
    this.isDeletedForEveryone = false,
    this.isEdited = false,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    final senderName = json['sender_name'] as String? ?? 'Anggota';
    final file = json['file'] as Map<String, dynamic>?;
    final fileId = json['file_id'] as String? ?? file?['id'] as String?;
    final backendType = json['type'] as String?;
    final mimeType = file?['mime_type'] as String? ?? '';

    MessageType type = _messageTypeFromBackend(backendType);

    // If type is file, try to infer more specific type from mimeType
    if (type == MessageType.file) {
      if (mimeType.startsWith('video/')) {
        type = MessageType.video;
      } else if (mimeType.startsWith('audio/')) {
        type = MessageType.audio;
      } else if (mimeType.startsWith('image/')) {
        type = MessageType.image;
      }
    }

    // If type is still file, try to infer from extension as a fallback
    if (type == MessageType.file && file?['file_name'] != null) {
      final fileName = file!['file_name'] as String;
      final ext = fileName.split('.').last.toLowerCase();
      if (['mp4', 'mov', 'avi', 'mkv'].contains(ext)) {
        type = MessageType.video;
      } else if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].contains(ext)) {
        type = MessageType.audio;
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].contains(ext)) {
        type = MessageType.image;
      }
    }

    final createdAt = DateTime.tryParse(json['created_at'] as String? ?? '');

    return Message(
      id: json['id'] as String? ?? '',
      channelId: json['channel_id'] as String?,
      senderId: json['sender_id'] as String?,
      user: senderName,
      avatar: _initials(senderName),
      avatarUrl: json['sender_avatar_url'] as String?,
      status: json['sender_status'] as String?,
      time: createdAt == null
          ? ''
          : '${createdAt.toLocal().hour.toString().padLeft(2, '0')}:${createdAt.toLocal().minute.toString().padLeft(2, '0')}',
      type: type,
      text: json['content'] as String?,
      fileName: file?['file_name'] as String?,
      fileSize: _formatFileSize(file?['file_size']),
      filePath: file?['signed_url'] as String?,
      fileId: fileId,
      isEdited: json['edited'] as bool? ?? false,
    );
  }

  Message copyWith({
    String? text,
    bool? isDeletedForEveryone,
    bool? isEdited,
    String? avatarUrl,
    String? status,
  }) {
    return Message(
      id: id,
      channelId: channelId,
      senderId: senderId,
      user: user,
      avatar: avatar,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      status: status ?? this.status,
      time: time,
      type: type,
      text: text ?? this.text,
      fileName: fileName,
      fileSize: fileSize,
      filePath: filePath,
      fileId: fileId ?? this.fileId,
      isDeletedForEveryone: isDeletedForEveryone ?? this.isDeletedForEveryone,
      isEdited: isEdited ?? this.isEdited,
    );
  }

  static MessageType _messageTypeFromBackend(String? type) {
    return MessageType.values.firstWhere(
      (value) => value.name == type,
      orElse: () => MessageType.text,
    );
  }

  static String _initials(String name) {
    final words = name.trim().split(RegExp(r'\s+')).where((word) => word.isNotEmpty).toList();
    if (words.isEmpty) return '?';
    if (words.length == 1) return words.first[0].toUpperCase();
    return '${words[0][0]}${words[1][0]}'.toUpperCase();
  }

  static String? _formatFileSize(dynamic value) {
    final size = value is num ? value.toDouble() : null;
    if (size == null || size <= 0) return null;
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(1)} KB';
    return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}

class Room {
  final String id;
  final String name;
  final bool isFolder;

  Room({required this.id, required this.name, this.isFolder = false});
}

enum UserStatus { online, idle, dnd, invisible }

extension UserStatusExtension on UserStatus {
  String toBackendString() {
    switch (this) {
      case UserStatus.online:
        return 'online';
      case UserStatus.idle:
        return 'idle';
      case UserStatus.dnd:
        return 'dnd';
      case UserStatus.invisible:
        return 'offline';
    }
  }
}
