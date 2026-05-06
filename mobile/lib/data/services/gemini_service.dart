import 'package:dio/dio.dart';
import '../models/chat_models.dart';

class GeminiService {
  static const String _defaultModel = 'gemini-2.5-flash';
  final Dio _dio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 45),
    ),
  );
  final String apiKey;
  final String model;

  GeminiService({required this.apiKey, String? model})
    : model = (model == null || model.trim().isEmpty)
          ? _defaultModel
          : model.trim();

  String get _url =>
      'https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent';

  Future<String> summarize(List<Message> messages) async {
    if (messages.isEmpty) return 'Tidak ada pesan untuk dirangkum.';
    if (apiKey.trim().isEmpty) {
      return 'API key Gemini belum diatur. Isi GEMINI_API_KEY di file .env, lalu jalankan ulang aplikasi.';
    }

    try {
      final chatLog = messages
          .map((m) {
            final content = m.text ?? '(Mengirim file: ${m.fileName})';
            return '${m.user}: $content';
          })
          .join('\n');

      final response = await _dio.post(
        _url,
        data: {
          'contents': [
            {
              'parts': [
                {
                  'text':
                      'Kamu adalah asisten AI yang cerdas. Tolong rangkum diskusi berikut dalam bahasa Indonesia, berikan poin penting dan daftar tugas (action items) jika ada:\n\n$chatLog',
                },
              ],
            },
          ],
        },
        options: Options(
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          validateStatus: (status) => status! < 500,
        ),
      );

      if (response.statusCode != 200) {
        return 'Gagal menghubungi Gemini (Error ${response.statusCode}): ${response.data['error']?['message'] ?? 'Unknown error'}';
      }

      final text =
          response.data['candidates']?[0]?['content']?['parts']?[0]?['text']
              as String?;
      return text ?? 'Gagal membuat rangkuman.';
    } catch (e) {
      return 'Terjadi kesalahan saat menghubungi Gemini API: $e';
    }
  }

  Future<String?> polishText(String text) async {
    if (text.trim().isEmpty) return null;
    if (apiKey.trim().isEmpty) return null;

    try {
      final response = await _dio.post(
        _url,
        data: {
          'contents': [
            {
              'parts': [
                {
                  'text':
                      'Perbaiki kalimat berikut menjadi lebih profesional untuk dikirim ke grup kerja (bahasa Indonesia). Kembalikan teks hasil perbaikannya saja:\n\n"$text"',
                },
              ],
            },
          ],
        },
        options: Options(
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          validateStatus: (status) => status! < 500,
        ),
      );

      if (response.statusCode != 200) return null;

      final result =
          response.data['candidates']?[0]?['content']?['parts']?[0]?['text']
              as String?;
      if (result == null) return null;
      return result.trim().replaceAll(RegExp('^["\']|["\']\$'), '');
    } catch (e) {
      return null;
    }
  }
}
