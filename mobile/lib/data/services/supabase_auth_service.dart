import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'app_config.dart';

class SupabaseAuthSession {
  final String id;
  final String email;
  final String name;
  final String accessToken;
  final bool isGoogleAccount;

  const SupabaseAuthSession({
    required this.id,
    required this.email,
    required this.name,
    required this.accessToken,
    this.isGoogleAccount = false,
  });
}

class SupabaseAuthService {
  final _client = Supabase.instance.client;

  Future<SupabaseAuthSession> signInWithPassword({
    required String email,
    required String password,
  }) async {
    final response = await _client.auth.signInWithPassword(
      email: email,
      password: password,
    );

    return _sessionFromAuthResponse(response);
  }

  Future<SupabaseAuthSession> signUp({
    required String name,
    required String email,
    required String password,
  }) async {
    final response = await _client.auth.signUp(
      email: email,
      password: password,
      data: {'full_name': name, 'name': name},
    );

    return _sessionFromAuthResponse(response);
  }

  Future<SupabaseAuthSession> signInWithGoogle() async {
    final clientId = AppConfig.googleClientId;
    final googleSignIn = GoogleSignIn(
      serverClientId: clientId.isNotEmpty ? clientId : null,
    );
    final googleUser = await googleSignIn.signIn();

    if (googleUser == null) {
      throw 'Masuk dengan Google dibatalkan.';
    }

    final googleAuth = await googleUser.authentication;
    final accessToken = googleAuth.accessToken;
    final idToken = googleAuth.idToken;

    if (idToken == null) {
      throw 'Gagal mendapatkan ID Token dari Google.';
    }

    final response = await _client.auth.signInWithIdToken(
      provider: OAuthProvider.google,
      idToken: idToken,
      accessToken: accessToken,
    );

    return _sessionFromAuthResponse(response);
  }

  SupabaseAuthSession _sessionFromAuthResponse(AuthResponse response) {
    final session = response.session;
    final user = response.user;

    if (session == null || user == null) {
      throw Exception(
        'Akun berhasil dibuat, tapi Supabase meminta verifikasi email sebelum login.',
      );
    }

    final metadata = user.userMetadata ?? {};
    final email = user.email ?? '';
    final name =
        metadata['full_name'] as String? ??
        metadata['name'] as String? ??
        email.split('@').first;
    
    final provider = user.appMetadata['provider'] as String?;
    final isGoogle = provider == 'google';

    return SupabaseAuthSession(
      id: user.id,
      email: email,
      name: name,
      accessToken: session.accessToken,
      isGoogleAccount: isGoogle,
    );
  }
}
