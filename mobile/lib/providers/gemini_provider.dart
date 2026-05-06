import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/models/chat_models.dart';
import '../data/services/gemini_service.dart';

String _readGeminiApiKey() {
  const dartDefineValue = String.fromEnvironment('GEMINI_API_KEY');
  if (dartDefineValue.isNotEmpty) return dartDefineValue;

  return dotenv.env['GEMINI_API_KEY'] ?? '';
}

String _readGeminiModel() {
  const dartDefineValue = String.fromEnvironment('GEMINI_MODEL');
  if (dartDefineValue.isNotEmpty) return dartDefineValue;

  return dotenv.env['GEMINI_MODEL'] ?? '';
}

final geminiServiceProvider = Provider((ref) {
  return GeminiService(apiKey: _readGeminiApiKey(), model: _readGeminiModel());
});

class GeminiState {
  final bool isSummarizing;
  final bool isPolishing;
  final String summaryResult;

  GeminiState({
    this.isSummarizing = false,
    this.isPolishing = false,
    this.summaryResult = '',
  });

  GeminiState copyWith({
    bool? isSummarizing,
    bool? isPolishing,
    String? summaryResult,
  }) {
    return GeminiState(
      isSummarizing: isSummarizing ?? this.isSummarizing,
      isPolishing: isPolishing ?? this.isPolishing,
      summaryResult: summaryResult ?? this.summaryResult,
    );
  }
}

class GeminiNotifier extends StateNotifier<GeminiState> {
  final GeminiService _service;

  GeminiNotifier(this._service) : super(GeminiState());

  Future<void> summarize(List<Message> messages) async {
    state = state.copyWith(isSummarizing: true, summaryResult: '');
    final result = await _service.summarize(messages);
    state = state.copyWith(isSummarizing: false, summaryResult: result);
  }

  Future<String?> polishText(String text) async {
    state = state.copyWith(isPolishing: true);
    final result = await _service.polishText(text);
    state = state.copyWith(isPolishing: false);
    return result;
  }

  void clearSummary() {
    state = state.copyWith(summaryResult: '');
  }
}

final geminiProvider = StateNotifierProvider<GeminiNotifier, GeminiState>((
  ref,
) {
  final service = ref.watch(geminiServiceProvider);
  return GeminiNotifier(service);
});
