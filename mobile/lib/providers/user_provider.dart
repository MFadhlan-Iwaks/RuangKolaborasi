import 'dart:convert';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import '../data/models/chat_models.dart';
import '../data/services/backend_service.dart';
import 'auth_provider.dart';

class UserState {
  final String name;
  final UserStatus status;
  final String? photoPath;
  final String? avatarUrl;
  final String bio;

  UserState({
    required this.name,
    required this.status,
    this.photoPath,
    this.avatarUrl,
    this.bio = '',
  });

  UserState copyWith({
    String? name,
    UserStatus? status,
    String? photoPath,
    String? avatarUrl,
    String? bio,
  }) {
    return UserState(
      name: name ?? this.name,
      status: status ?? this.status,
      photoPath: photoPath ?? this.photoPath,
      avatarUrl: avatarUrl ?? this.avatarUrl,
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
        final backendStatus = status.toBackendString();
        await _backendService.updateStatus(
          accessToken: _accessToken,
          status: backendStatus,
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

  void setAuthenticatedUser(AuthUser user) {
    state = UserState(
      name: user.name,
      status: UserStatus.online,
      avatarUrl: user.avatarUrl,
      bio: user.bio ?? '',
    );
  }

  void updateProfile({
    required String name,
    required String bio,
    String? photoPath,
    String? avatarUrl,
  }) async {
    String? effectiveAvatarUrl = avatarUrl;

    // If we have a local photo path but no avatarUrl yet, try to convert to base64
    if (photoPath != null &&
        photoPath.isNotEmpty &&
        (avatarUrl == null || avatarUrl.isEmpty)) {
      try {
        final file = File(photoPath);
        if (await file.exists()) {
          final bytes = await file.readAsBytes();
          final String extension = p.extension(photoPath).replaceAll('.', '');
          final String mimeType =
              extension == 'png' ? 'image/png' : 'image/jpeg';
          effectiveAvatarUrl = 'data:$mimeType;base64,${base64Encode(bytes)}';
        }
      } catch (e) {
        print('Gagal membaca file foto profil: $e');
      }
    }

    state = state.copyWith(
      name: name.trim().isEmpty ? state.name : name.trim(),
      bio: bio.trim(),
      photoPath: photoPath,
      avatarUrl: effectiveAvatarUrl,
    );

    if (_accessToken.isNotEmpty) {
      try {
        await _backendService.updateProfile(
          accessToken: _accessToken,
          fullName: name.trim().isEmpty ? null : name.trim(),
          bio: bio.trim(),
          avatarUrl: effectiveAvatarUrl,
        );
      } catch (e) {
        print('Gagal update profil di server: $e');
      }
    }
  }
}

final userProvider = StateNotifierProvider<UserNotifier, UserState>((ref) {
  final authUser = ref.watch(authProvider.select((state) => state.currentUser));
  final accessToken = authUser?.accessToken ?? '';
  
  final notifier = UserNotifier(accessToken: accessToken);
  
  if (authUser != null) {
    // Small delay to avoid side effects during provider build
    Future.microtask(() => notifier.setAuthenticatedUser(authUser));
  }
  
  return notifier;
});
