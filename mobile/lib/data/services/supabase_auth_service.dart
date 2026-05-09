import 'package:dio/dio.dart';
import 'app_config.dart';

class SupabaseAuthSession {
  final String id;
  final String email;
  final String name;
  final String accessToken;

  const SupabaseAuthSession({
    required this.id,
    required this.email,
    required this.name,
    required this.accessToken,
  });
}

class SupabaseAuthService {
  SupabaseAuthService({Dio? dio})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: AppConfig.supabaseUrl,
              connectTimeout: const Duration(seconds: 20),
              receiveTimeout: const Duration(seconds: 30),
              validateStatus: (status) => status != null && status < 500,
            ),
          );

  final Dio _dio;

  bool get isConfigured =>
      AppConfig.supabaseUrl.isNotEmpty &&
      AppConfig.supabasePublishableKey.isNotEmpty;

  Future<SupabaseAuthSession> signInWithPassword({
    required String email,
    required String password,
  }) async {
    _ensureConfigured();

    final response = await _dio.post(
      '/auth/v1/token',
      queryParameters: {'grant_type': 'password'},
      data: {'email': email, 'password': password},
      options: Options(headers: _headers),
    );

    return _sessionFromResponse(response);
  }

  Future<SupabaseAuthSession> signUp({
    required String name,
    required String email,
    required String password,
  }) async {
    _ensureConfigured();

    final response = await _dio.post(
      '/auth/v1/signup',
      data: {
        'email': email,
        'password': password,
        'data': {'full_name': name, 'name': name},
      },
      options: Options(headers: _headers),
    );

    return _sessionFromResponse(response);
  }

  Map<String, String> get _headers => {
    'apikey': AppConfig.supabasePublishableKey,
    'Authorization': 'Bearer ${AppConfig.supabasePublishableKey}',
    'Content-Type': 'application/json',
  };

  void _ensureConfigured() {
    if (isConfigured) return;

    throw Exception(
      'SUPABASE_URL dan SUPABASE_PUBLISHABLE_KEY belum diatur di file .env mobile.',
    );
  }

  SupabaseAuthSession _sessionFromResponse(Response<dynamic> response) {
    final statusCode = response.statusCode ?? 0;
    final data = response.data;

    if (statusCode < 200 || statusCode >= 300) {
      throw Exception(_errorMessage(data, statusCode));
    }

    if (data is! Map<String, dynamic>) {
      throw Exception('Respons Supabase tidak valid.');
    }

    final accessToken = data['access_token'] as String?;
    final user = data['user'] as Map<String, dynamic>?;

    if (accessToken == null || user == null) {
      throw Exception(
        'Akun berhasil dibuat, tapi Supabase meminta verifikasi email sebelum login.',
      );
    }

    final metadata = user['user_metadata'] as Map<String, dynamic>? ?? {};
    final email = user['email'] as String? ?? '';
    final name =
        metadata['full_name'] as String? ??
        metadata['name'] as String? ??
        email.split('@').first;

    return SupabaseAuthSession(
      id: user['id'] as String? ?? '',
      email: email,
      name: name,
      accessToken: accessToken,
    );
  }

  String _errorMessage(dynamic data, int statusCode) {
    if (data is Map<String, dynamic>) {
      return data['msg'] as String? ??
          data['message'] as String? ??
          data['error_description'] as String? ??
          data['error'] as String? ??
          'Supabase mengembalikan error $statusCode.';
    }

    return 'Supabase mengembalikan error $statusCode.';
  }
}
