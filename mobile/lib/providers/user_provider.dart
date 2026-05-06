import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/models/chat_models.dart';

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
  UserNotifier()
    : super(UserState(name: 'Tugas Besar PABP', status: UserStatus.online));

  void setStatus(UserStatus status) {
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
  return UserNotifier();
});
