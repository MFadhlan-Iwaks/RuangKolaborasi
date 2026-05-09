import '../models/chat_models.dart';
import 'backend_service.dart';

class GeminiService {
  final BackendService _backendService;
  final String accessToken;

  GeminiService({required this.accessToken, BackendService? backendService})
    : _backendService = backendService ?? BackendService();

  Future<String> summarize(List<Message> messages) async {
    if (messages.isEmpty) return 'Tidak ada pesan untuk dirangkum.';
    if (accessToken.trim().isEmpty) {
      return 'Kamu perlu login agar backend bisa membuat rangkuman.';
    }

    try {
      return await _backendService.summarizeMessages(
        accessToken: accessToken,
        messages: messages,
      );
    } catch (e) {
      return 'Terjadi kesalahan saat menghubungi backend: ${_cleanError(e)}';
    }
  }

  Future<String?> polishText(String text) async {
    if (text.trim().isEmpty) return null;
    if (accessToken.trim().isEmpty) return null;

    try {
      return await _backendService.polishMessage(
        accessToken: accessToken,
        text: text,
      );
    } catch (e) {
      return null;
    }
  }

  String _cleanError(Object error) {
    final message = error.toString();
    return message.startsWith('Exception: ')
        ? message.substring('Exception: '.length)
        : message;
  }
}
