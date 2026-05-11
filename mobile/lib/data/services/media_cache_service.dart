import 'dart:io';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import '../models/chat_models.dart';

class MediaCacheService {
  static const String cacheKey = 'ruang_kolaborasi_media_cache';
  
  static final MediaCacheService _instance = MediaCacheService._internal();
  factory MediaCacheService() => _instance;
  MediaCacheService._internal();

  final CacheManager _cacheManager = CacheManager(
    Config(
      cacheKey,
      stalePeriod: const Duration(days: 30),
      maxNrOfCacheObjects: 500,
      repo: JsonCacheInfoRepository(databaseName: cacheKey),
      fileService: HttpFileService(),
    ),
  );

  CacheManager get cacheManager => _cacheManager;

  /// Precaches a message's media if it's an image, video, or audio.
  void precacheMessage(Message message) {
    if (message.filePath == null) return;
    if (!_isNetworkPath(message.filePath!)) return;

    final type = message.type;
    if (type == MessageType.image || 
        type == MessageType.video || 
        type == MessageType.audio) {
      // Use fileId as a stable key because signed URLs expire
      final key = message.fileId ?? message.filePath;
      
      // We don't await this as we want it to happen in the background
      _cacheManager.getFileStream(message.filePath!, key: key).listen(
        (response) {
          // Successfully cached or progress update
        },
        onError: (e) {
          // Handle error silently in background
        },
      );
    }
  }

  Future<File> getSingleFile(String url, {String? key}) async {
    return await _cacheManager.getSingleFile(url, key: key);
  }

  bool _isNetworkPath(String path) {
    return path.startsWith('http://') || path.startsWith('https://');
  }
}

final mediaCacheService = MediaCacheService();
