enum MessageType { text, file, image, video, audio }

class Message {
  final int id;
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

  Message copyWith({String? text, bool? isDeletedForEveryone, bool? isEdited}) {
    return Message(
      id: id,
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
}

class Room {
  final String id;
  final String name;
  final bool isFolder;

  Room({required this.id, required this.name, this.isFolder = false});
}

enum UserStatus { online, idle, dnd, invisible }
