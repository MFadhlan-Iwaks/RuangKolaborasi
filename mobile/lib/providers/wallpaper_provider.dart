import 'package:flutter_riverpod/flutter_riverpod.dart';

class WallpaperState {
  final String? imagePath;
  final bool isDefault;

  WallpaperState({this.imagePath, this.isDefault = true});

  WallpaperState copyWith({String? imagePath, bool? isDefault}) {
    return WallpaperState(
      imagePath: imagePath ?? this.imagePath,
      isDefault: isDefault ?? this.isDefault,
    );
  }
}

class WallpaperNotifier extends StateNotifier<WallpaperState> {
  WallpaperNotifier() : super(WallpaperState());

  void setWallpaper(String path) {
    state = WallpaperState(imagePath: path, isDefault: false);
  }

  void resetWallpaper() {
    state = WallpaperState(imagePath: null, isDefault: true);
  }
}

final wallpaperProvider = StateNotifierProvider<WallpaperNotifier, WallpaperState>((ref) {
  return WallpaperNotifier();
});
