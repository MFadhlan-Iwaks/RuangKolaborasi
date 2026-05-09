import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/services/backend_service.dart';
import '../data/services/supabase_auth_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthUser {
  final String id;
  final String name;
  final String email;
  final String accessToken;
  final bool isGoogleAccount;

  const AuthUser({
    required this.id,
    required this.name,
    required this.email,
    required this.accessToken,
    this.isGoogleAccount = false,
  });
}

class AuthState {
  final bool isLoading;
  final AuthUser? currentUser;

  const AuthState({this.isLoading = false, this.currentUser});

  AuthState copyWith({bool? isLoading, AuthUser? currentUser}) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      currentUser: currentUser ?? this.currentUser,
    );
  }
}

class AuthResult {
  final AuthUser? user;
  final String? error;

  const AuthResult._({this.user, this.error});

  factory AuthResult.success(AuthUser user) => AuthResult._(user: user);

  factory AuthResult.failure(String message) => AuthResult._(error: message);

  bool get isSuccess => user != null;
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier({
    SupabaseAuthService? authService,
    BackendService? backendService,
  }) : _authService = authService ?? SupabaseAuthService(),
       _backendService = backendService ?? BackendService(),
       super(const AuthState());

  final SupabaseAuthService _authService;
  final BackendService _backendService;

  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    final normalizedEmail = email.trim().toLowerCase();

    if (!_isValidEmail(normalizedEmail)) {
      return AuthResult.failure('Email belum valid.');
    }
    if (password.isEmpty) {
      return AuthResult.failure('Kata sandi wajib diisi.');
    }

    state = state.copyWith(isLoading: true);

    try {
      final session = await _authService.signInWithPassword(
        email: normalizedEmail,
        password: password,
      );
      final user = await _syncBackendProfile(session);
      state = AuthState(currentUser: user);
      return AuthResult.success(user);
    } catch (e) {
      state = state.copyWith(isLoading: false);
      return AuthResult.failure(_cleanError(e));
    }
  }

  Future<AuthResult> register({
    required String name,
    required String email,
    required String password,
    required String confirmPassword,
  }) async {
    final normalizedName = name.trim();
    final normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.isEmpty) {
      return AuthResult.failure('Nama user wajib diisi.');
    }
    if (!_isValidEmail(normalizedEmail)) {
      return AuthResult.failure('Email belum valid.');
    }
    if (password.length < 6) {
      return AuthResult.failure('Kata sandi minimal 6 karakter.');
    }
    if (password != confirmPassword) {
      return AuthResult.failure('Konfirmasi kata sandi tidak sama.');
    }

    state = state.copyWith(isLoading: true);

    try {
      final session = await _authService.signUp(
        name: normalizedName,
        email: normalizedEmail,
        password: password,
      );
      final user = await _syncBackendProfile(session);
      state = AuthState(currentUser: user);
      return AuthResult.success(user);
    } catch (e) {
      state = state.copyWith(isLoading: false);
      return AuthResult.failure(_cleanError(e));
    }
  }

  Future<AuthResult> signInWithGoogle() async {
    return AuthResult.failure(
      'Login Google perlu konfigurasi OAuth Supabase di aplikasi mobile. Gunakan email dan kata sandi dulu.',
    );
  }

  Future<void> logout() async {
    try {
      await Supabase.instance.client.auth.signOut();
    } catch (_) {}
    state = const AuthState();
  }

  bool _isValidEmail(String email) {
    return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email);
  }

  Future<AuthUser> _syncBackendProfile(SupabaseAuthSession session) async {
    await _backendService.ensureProfile(
      accessToken: session.accessToken,
      fullName: session.name,
    );

    // NOTE: setting auth token on the Supabase client must use the
    // client API compatible with the installed `supabase_flutter` version.
    // Previously attempted to call `setAuth(...)` but that method is not
    // available in newer GOTRUE clients and causes a compile error.
    // If realtime events are still blocked by RLS, update this code to
    // set the session using the appropriate client method for your
    // `supabase_flutter` version (or use the built-in auth client).

    return AuthUser(
      id: session.id,
      name: session.name,
      email: session.email,
      accessToken: session.accessToken,
    );
  }

  String _cleanError(Object error) {
    final message = error.toString();
    return message.startsWith('Exception: ')
        ? message.substring('Exception: '.length)
        : message;
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
