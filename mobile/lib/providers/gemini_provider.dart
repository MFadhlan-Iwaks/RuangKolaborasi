import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/models/chat_models.dart';
import '../data/services/gemini_service.dart';
import 'auth_provider.dart';

final geminiServiceProvider = Provider((ref) {
  final authState = ref.watch(authProvider);
  return GeminiService(accessToken: authState.currentUser?.accessToken ?? '');
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
