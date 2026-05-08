import 'package:dio/dio.dart';
import '../models/chat_models.dart';
import 'app_config.dart';

class WorkspaceBootstrap {
  final List<Workspace> workspaces;
  final Map<String, List<Channel>> channelsByWorkspace;
  final Map<String, Map<String, List<Message>>> messagesByWorkspace;
  final Map<String, List<WorkspaceMember>> membersByWorkspace;

  const WorkspaceBootstrap({
    required this.workspaces,
    required this.channelsByWorkspace,
    required this.messagesByWorkspace,
    required this.membersByWorkspace,
  });

  factory WorkspaceBootstrap.fromJson(Map<String, dynamic> json) {
    final workspaces = (json['workspaces'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(Workspace.fromJson)
        .toList();

    final channelsByWorkspace = <String, List<Channel>>{};
    final roomsJson = json['roomsByWorkspace'] as Map<String, dynamic>? ?? {};
    for (final entry in roomsJson.entries) {
      channelsByWorkspace[entry.key] = (entry.value as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(Channel.fromJson)
          .toList();
    }

    final messagesByWorkspace = <String, Map<String, List<Message>>>{};
    final messagesJson =
        json['messagesByWorkspace'] as Map<String, dynamic>? ?? {};
    for (final workspaceEntry in messagesJson.entries) {
      final channels = <String, List<Message>>{};
      final channelMessages =
          workspaceEntry.value as Map<String, dynamic>? ?? {};
      for (final channelEntry in channelMessages.entries) {
        channels[channelEntry.key] =
            (channelEntry.value as List<dynamic>? ?? [])
                .whereType<Map<String, dynamic>>()
                .map(Message.fromJson)
                .toList();
      }
      messagesByWorkspace[workspaceEntry.key] = channels;
    }

    final membersByWorkspace = <String, List<WorkspaceMember>>{};
    final membersJson = json['membersByWorkspace'] as Map<String, dynamic>? ?? {};
    for (final entry in membersJson.entries) {
      membersByWorkspace[entry.key] = (entry.value as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(WorkspaceMember.fromJson)
          .toList();
    }

    return WorkspaceBootstrap(
      workspaces: workspaces,
      channelsByWorkspace: channelsByWorkspace,
      messagesByWorkspace: messagesByWorkspace,
      membersByWorkspace: membersByWorkspace,
    );
  }
}

class BackendService {
  BackendService({Dio? dio})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              connectTimeout: const Duration(seconds: 5),
              receiveTimeout: const Duration(seconds: 45),
              headers: {'Content-Type': 'application/json'},
              validateStatus: (status) => status != null && status < 500,
            ),
          );

  final Dio _dio;

  bool get isConfigured => AppConfig.apiBaseUrls.isNotEmpty;

  Future<WorkspaceBootstrap> fetchWorkspaceBootstrap({
    required String accessToken,
  }) async {
    final response = await _authorizedGet(
      '/api/workspaces/bootstrap',
      accessToken,
    );
    _throwIfFailed(response);

    return WorkspaceBootstrap.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
  }

  Future<void> ensureProfile({
    required String accessToken,
    required String fullName,
  }) async {
    final response = await _authorizedPost(
      '/api/auth/ensure-profile',
      accessToken,
      data: {'fullName': fullName},
    );
    _throwIfFailed(response);
  }

  Future<void> updateStatus({
    required String accessToken,
    required String status,
  }) async {
    final response = await _authorizedPatch(
      '/api/auth/status',
      accessToken,
      data: {'status': status},
    );
    _throwIfFailed(response);
  }

  Future<String> summarizeMessages({
    required String accessToken,
    required List<Message> messages,
  }) async {
    final response = await _authorizedPost(
      '/api/ai/summarize',
      accessToken,
      data: {
        'messages': messages
            .map(
              (message) => {
                'senderName': message.user,
                'content': message.text ?? message.fileName ?? '',
                'type': message.type.name,
              },
            )
            .toList(),
      },
    );
    _throwIfFailed(response);

    return response.data['summary'] as String? ?? 'Gagal membuat rangkuman.';
  }

  Future<String?> polishMessage({
    required String accessToken,
    required String text,
  }) async {
    final response = await _authorizedPost(
      '/api/ai/polish-message',
      accessToken,
      data: {'text': text},
    );
    _throwIfFailed(response);

    return (response.data['polishedText'] as String?)?.trim();
  }

  Future<Message> sendChannelMessage({
    required String accessToken,
    required String channelId,
    required String content,
  }) async {
    final response = await _authorizedPost(
      '/api/workspaces/channels/$channelId/messages',
      accessToken,
      data: {'content': content, 'type': 'text'},
    );
    _throwIfFailed(response);

    return Message.fromJson(
      Map<String, dynamic>.from(response.data['message'] as Map),
    );
  }

  Future<Message> updateMessage({
    required String accessToken,
    required String messageId,
    required String content,
  }) async {
    final response = await _authorizedPatch(
      '/api/workspaces/messages/$messageId',
      accessToken,
      data: {'content': content},
    );
    _throwIfFailed(response);

    return Message.fromJson(
      Map<String, dynamic>.from(response.data['message'] as Map),
    );
  }

  Future<void> deleteMessage({
    required String accessToken,
    required String messageId,
  }) async {
    final response = await _authorizedDelete(
      '/api/workspaces/messages/$messageId',
      accessToken,
    );
    _throwIfFailed(response);
  }

  Future<Message> uploadChannelFile({
    required String accessToken,
    required String channelId,
    required String fileName,
    required String mimeType,
    required int fileSize,
    required String contentBase64,
    String? caption,
  }) async {
    final response = await _authorizedPost(
      '/api/workspaces/channels/$channelId/files',
      accessToken,
      data: {
        'fileName': fileName,
        'mimeType': mimeType,
        'fileSize': fileSize,
        'contentBase64': contentBase64,
        'caption': caption ?? '',
      },
    );
    _throwIfFailed(response);

    return Message.fromJson(
      Map<String, dynamic>.from(response.data['message'] as Map),
    );
  }

  Future<Channel> createChannel({
    required String accessToken,
    required String workspaceId,
    required String name,
    String description = '',
  }) async {
    final response = await _authorizedPost(
      '/api/workspaces/$workspaceId/channels',
      accessToken,
      data: {'name': name, 'description': description},
    );
    _throwIfFailed(response);

    return Channel.fromJson(
      Map<String, dynamic>.from(response.data['channel'] as Map),
    );
  }

  Future<Response<dynamic>> _authorizedGet(String path, String accessToken) {
    return _authorizedRequest(
      path,
      accessToken,
      request: (url, options) => _dio.get(url, options: options),
    );
  }

  Future<Response<dynamic>> _authorizedPost(
    String path,
    String accessToken, {
    Object? data,
  }) {
    return _authorizedRequest(
      path,
      accessToken,
      request: (url, options) => _dio.post(url, data: data, options: options),
    );
  }

  Future<Response<dynamic>> _authorizedPatch(
    String path,
    String accessToken, {
    Object? data,
  }) {
    return _authorizedRequest(
      path,
      accessToken,
      request: (url, options) => _dio.patch(url, data: data, options: options),
    );
  }

  Future<Response<dynamic>> _authorizedDelete(String path, String accessToken) {
    return _authorizedRequest(
      path,
      accessToken,
      request: (url, options) => _dio.delete(url, options: options),
    );
  }

  Future<Response<dynamic>> _authorizedRequest(
    String path,
    String accessToken, {
    required Future<Response<dynamic>> Function(String url, Options options)
    request,
  }) async {
    if (!isConfigured) {
      throw Exception('API_BASE_URL belum diatur di file .env mobile.');
    }

    DioException? lastConnectionError;

    for (final baseUrl in AppConfig.apiBaseUrls) {
      try {
        return await request(
          '$baseUrl$path',
          Options(headers: {'Authorization': 'Bearer $accessToken'}),
        );
      } on DioException catch (e) {
        if (!_isConnectionError(e)) rethrow;
        lastConnectionError = e;
      }
    }

    throw Exception(
      'Tidak bisa menghubungi backend di ${AppConfig.apiBaseUrls.join(', ')}. '
      'Pastikan backend berjalan dan URL di .env cocok dengan target run. '
      'Android emulator pakai http://10.0.2.2:5000, desktop pakai http://localhost:5000, HP fisik pakai IP laptop. '
      '${lastConnectionError?.message ?? ''}',
    );
  }

  bool _isConnectionError(DioException error) {
    return error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.receiveTimeout;
  }

  void _throwIfFailed(Response<dynamic> response) {
    final statusCode = response.statusCode ?? 0;
    if (statusCode >= 200 && statusCode < 300) return;

    final data = response.data;
    if (data is Map<String, dynamic>) {
      throw Exception(
        data['message'] as String? ??
            data['error_description'] as String? ??
            data['error'] as String? ??
            'Backend mengembalikan error $statusCode.',
      );
    }

    throw Exception('Backend mengembalikan error $statusCode.');
  }
}
