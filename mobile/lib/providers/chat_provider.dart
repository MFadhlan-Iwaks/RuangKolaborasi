import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../data/models/chat_models.dart';

class MessagesNotifier extends StateNotifier<List<Message>> {
  MessagesNotifier() : super([
    Message(
      id: 1,
      user: 'Rezza',
      avatar: 'R',
      time: '09:00',
      type: MessageType.text,
      text: 'Pagi tim! Struktur database udah aku push ke repo ya. Tolong dicek.',
    ),
    Message(
      id: 2,
      user: 'Sammi Zaki',
      avatar: 'S',
      time: '09:15',
      type: MessageType.text,
      text: 'Sip, nanti aku tarik buat disambungin ke form Next.js.',
    ),
    Message(
      id: 3,
      user: 'Gibran',
      avatar: 'G',
      time: '09:30',
      type: MessageType.text,
      text: 'Akses kamera di mobile udah bisa baca QR code. Tinggal nunggu endpoint dari Rezza.',
    ),
  ]);

  void addMessage(String text) {
    final newMessage = Message(
      id: state.length + 1,
      user: 'Fadhlan (Kamu)',
      avatar: 'F',
      time: DateFormat('HH:mm').format(DateTime.now()),
      type: MessageType.text,
      text: text,
    );
    state = [...state, newMessage];
  }

  void addFileMessage({
    required MessageType type,
    String? fileName,
    String? fileSize,
    String? filePath,
  }) {
    final newMessage = Message(
      id: state.length + 1,
      user: 'Fadhlan (Kamu)',
      avatar: 'F',
      time: DateFormat('HH:mm').format(DateTime.now()),
      type: type,
      fileName: fileName,
      fileSize: fileSize,
      filePath: filePath,
    );
    state = [...state, newMessage];
  }

  void editMessage(int id, String newText) {
    state = [
      for (final msg in state)
        if (msg.id == id)
          msg.copyWith(text: newText, isEdited: true)
        else
          msg
    ];
  }

  void deleteMessageForMe(int id) {
    state = state.where((msg) => msg.id != id).toList();
  }

  void deleteMessageForEveryone(int id) {
    state = [
      for (final msg in state)
        if (msg.id == id)
          msg.copyWith(isDeletedForEveryone: true)
        else
          msg
    ];
  }
}

final messagesProvider = StateNotifierProvider<MessagesNotifier, List<Message>>((ref) {
  return MessagesNotifier();
});

final searchQueryProvider = StateProvider<String>((ref) => '');

final filteredMessagesProvider = Provider<List<Message>>((ref) {
  final messages = ref.watch(messagesProvider);
  final query = ref.watch(searchQueryProvider).toLowerCase();

  if (query.isEmpty) return messages;

  return messages.where((message) {
    final textMatch = message.text?.toLowerCase().contains(query) ?? false;
    final userMatch = message.user.toLowerCase().contains(query);
    return textMatch || userMatch;
  }).toList();
});
