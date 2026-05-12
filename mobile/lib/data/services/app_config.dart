import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  static List<String> get apiBaseUrls {
    final configuredUrl = apiBaseUrl;
    final urls = <String>[
      if (configuredUrl.isNotEmpty) configuredUrl,
      'http://10.0.2.2:5000',
      'http://localhost:5000',
    ];

    return urls.toSet().toList();
  }

  static String get apiBaseUrl {
    const dartDefineValue = String.fromEnvironment('API_BASE_URL');
    final value = dartDefineValue.isNotEmpty
        ? dartDefineValue
        : dotenv.env['API_BASE_URL'] ??
              dotenv.env['NEXT_PUBLIC_API_BASE_URL'] ??
              '';
    return _withoutTrailingSlash(value);
  }

  static String get supabaseUrl {
    const dartDefineValue = String.fromEnvironment('SUPABASE_URL');
    final value = dartDefineValue.isNotEmpty
        ? dartDefineValue
        : dotenv.env['SUPABASE_URL'] ??
              dotenv.env['NEXT_PUBLIC_SUPABASE_URL'] ??
              '';
    return _withoutTrailingSlash(value);
  }

  static String get supabasePublishableKey {
    const dartDefineValue = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');
    if (dartDefineValue.isNotEmpty) return dartDefineValue;

    return dotenv.env['SUPABASE_PUBLISHABLE_KEY'] ??
        dotenv.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] ??
        dotenv.env['SUPABASE_ANON_KEY'] ??
        '';
  }

  static String get googleClientId {
    return const String.fromEnvironment('GOOGLE_CLIENT_ID').isNotEmpty
        ? const String.fromEnvironment('GOOGLE_CLIENT_ID')
        : dotenv.env['GOOGLE_CLIENT_ID'] ?? '';
  }

  static String _withoutTrailingSlash(String value) {
    var trimmed = value.trim().replaceFirst(RegExp(r'/+$'), '');
    if (trimmed.isNotEmpty && !trimmed.contains('://')) {
      trimmed = 'http://$trimmed';
    }
    return trimmed;
  }
}
