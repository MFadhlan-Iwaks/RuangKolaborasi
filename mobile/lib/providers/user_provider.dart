import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/models/chat_models.dart';
import '../data/services/backend_service.dart';
import 'auth_provider.dart';

class UserState {
  final String name;
  final UserStatus status;
  final String? photoPath;
  final String bio;

  UserState({
    required this.name,
    required this.status,
    this.photoPath,
    this.bio = '',
  });

  UserState copyWith({
    String? name,
    UserStatus? status,
    String? photoPath,
    String? bio,
  }) {
    return UserState(
      name: name ?? this.name,
      status: status ?? this.status,
      photoPath: photoPath ?? this.photoPath,
      bio: bio ?? this.bio,
    );
  }
}

class UserNotifier extends StateNotifier<UserState> {
  UserNotifier({
    required String accessToken,
    BackendService? backendService,
  }) : _accessToken = accessToken,
       _backendService = backendService ?? BackendService(),
       super(UserState(name: 'Tugas Besar PABP', status: UserStatus.online));

  final BackendService _backendService;
  final String _accessToken;

  void setStatus(UserStatus status) async {
    final oldStatus = state.status;
    state = state.copyWith(status: status);

    if (_accessToken.isNotEmpty) {
      try {
        await _backendService.updateStatus(
          accessToken: _accessToken,
          status: status.name,
        );
      } catch (e) {
        // Rollback on error if needed, or just log
        print('Gagal update status di server: $e');
        state = state.copyWith(status: oldStatus);
      }
    }
  }

  void setAuthenticatedUserStatus(UserStatus status) {
    state = state.copyWith(status: status);
  }

  void setAuthenticatedUser(String name) {
    state = UserState(
      name: name.trim().isEmpty ? state.name : name.trim(),
      status: UserStatus.online,
    );
  }

  void updateProfile({
    required String name,
    required String bio,
    String? photoPath,
  }) {
    state = state.copyWith(
      name: name.trim().isEmpty ? state.name : name.trim(),
      bio: bio.trim(),
      photoPath: photoPath,
    );
  }
}

final userProvider = StateNotifierProvider<UserNotifier, UserState>((ref) {
  final accessToken = ref.watch(
    authProvider.select((state) => state.currentUser?.accessToken ?? ''),
  );
  return UserNotifier(accessToken: accessToken);
});
