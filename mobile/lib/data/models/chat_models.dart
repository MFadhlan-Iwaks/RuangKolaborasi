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
  final String time;
  final MessageType type;
  final String? text;
  final String? fileName;
  final String? fileSize;
  final String? filePath; // Path to local file or URL
  final bool isDeletedForEveryone;
  final bool isEdited;

  Message({
    required this.id,
    this.channelId,
    this.senderId,
    required this.user,
    required this.avatar,
    required this.time,
    required this.type,
    this.text,
    this.fileName,
    this.fileSize,
    this.filePath,
    this.isDeletedForEveryone = false,
    this.isEdited = false,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    final senderName = json['sender_name'] as String? ?? 'Anggota';
    final file = json['file'] as Map<String, dynamic>?;
    final type = _messageTypeFromBackend(json['type'] as String?);
    final createdAt = DateTime.tryParse(json['created_at'] as String? ?? '');

    return Message(
      id: json['id'] as String? ?? '',
      channelId: json['channel_id'] as String?,
      senderId: json['sender_id'] as String?,
      user: senderName,
      avatar: _initials(senderName),
      time: createdAt == null
          ? ''
          : '${createdAt.toLocal().hour.toString().padLeft(2, '0')}:${createdAt.toLocal().minute.toString().padLeft(2, '0')}',
      type: type,
      text: json['content'] as String?,
      fileName: file?['file_name'] as String?,
      fileSize: _formatFileSize(file?['file_size']),
      filePath: file?['signed_url'] as String?,
      isEdited: json['edited'] as bool? ?? false,
    );
  }

  Message copyWith({String? text, bool? isDeletedForEveryone, bool? isEdited}) {
    return Message(
      id: id,
      channelId: channelId,
      senderId: senderId,
      user: user,
      avatar: avatar,
      time: time,
      type: type,
      text: text ?? this.text,
      fileName: fileName,
      fileSize: fileSize,
      filePath: filePath,
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
