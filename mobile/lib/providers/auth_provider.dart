import 'package:flutter_riverpod/flutter_riverpod.dart';

class AuthUser {
  final String name;
  final String email;
  final bool isGoogleAccount;

  const AuthUser({
    required this.name,
    required this.email,
    this.isGoogleAccount = false,
  });
}

class _StoredAccount {
  final String name;
  final String email;
  final String password;

  const _StoredAccount({
    required this.name,
    required this.email,
    required this.password,
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
  AuthNotifier() : super(const AuthState());

  final Map<String, _StoredAccount> _accounts = {};

  AuthResult login({required String email, required String password}) {
    final normalizedEmail = email.trim().toLowerCase();

    if (!_isValidEmail(normalizedEmail)) {
      return AuthResult.failure('Email belum valid.');
    }
    if (password.isEmpty) {
      return AuthResult.failure('Kata sandi wajib diisi.');
    }

    final account = _accounts[normalizedEmail];
    if (account == null || account.password != password) {
      return AuthResult.failure('Email atau kata sandi salah.');
    }

    final user = AuthUser(name: account.name, email: account.email);
    state = state.copyWith(currentUser: user);
    return AuthResult.success(user);
  }

  AuthResult register({
    required String name,
    required String email,
    required String password,
    required String confirmPassword,
  }) {
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
    if (_accounts.containsKey(normalizedEmail)) {
      return AuthResult.failure('Email ini sudah terdaftar.');
    }

    final account = _StoredAccount(
      name: normalizedName,
      email: normalizedEmail,
      password: password,
    );
    _accounts[normalizedEmail] = account;

    final user = AuthUser(name: account.name, email: account.email);
    state = state.copyWith(currentUser: user);
    return AuthResult.success(user);
  }

  AuthResult signInWithGoogle() {
    const user = AuthUser(
      name: 'Google User',
      email: 'google.user@gmail.com',
      isGoogleAccount: true,
    );
    state = state.copyWith(currentUser: user);
    return AuthResult.success(user);
  }

  void logout() {
    state = const AuthState();
  }

  bool _isValidEmail(String email) {
    return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
