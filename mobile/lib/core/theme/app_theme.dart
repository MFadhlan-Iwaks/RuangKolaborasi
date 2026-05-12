import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Web Colors (Slate & Blue palette)
  static const Color slate950 = Color(0xFF0b1120); // Dark background from web
  static const Color slate900 = Color(0xFF0f172a); // Dark surface
  static const Color slate800 = Color(0xFF1e293b); // Dark hover/lighter surface
  static const Color slate700 = Color(0xFF334155); // Dark border
  static const Color slate500 = Color(0xFF64748b); // Muted text
  static const Color slate400 = Color(0xFF94a3b8); // Muted text dark
  static const Color slate300 = Color(0xFFcbd5e1); // Missing constant
  static const Color slate200 = Color(0xFFe2e8f0); // Light border/text
  static const Color slate100 = Color(0xFFf1f5f9); // Missing constant
  static const Color slate50 = Color(0xFFf8fafc);  // Lightest background

  static const Color indigo600 = Color(0xFF4F46E5); // Primary
  static const Color blue600 = Color(0xFF2563eb);   // Web primary/link
  static const Color blue300 = Color(0xFF93c5fd);   // Web primary dark mode

  static const Color zinc900 = Color(0xFF18181B);
  static const Color zinc100 = Color(0xFFF4F4F5);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: indigo600,
        primary: indigo600,
        surface: Colors.white,
        onSurface: slate950,
        brightness: Brightness.light,
      ),
      textTheme: GoogleFonts.plusJakartaSansTextTheme(),
      scaffoldBackgroundColor: Colors.white,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: slate950,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
        iconTheme: IconThemeData(color: slate700),
      ),
      drawerTheme: const DrawerThemeData(
        backgroundColor: Colors.white,
      ),
      dividerTheme: const DividerThemeData(
        color: slate200,
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: blue300,
        primary: blue300,
        surface: slate900,
        onSurface: slate50,
        brightness: Brightness.dark,
      ),
      textTheme: GoogleFonts.plusJakartaSansTextTheme(
        ThemeData(brightness: Brightness.dark).textTheme,
      ),
      scaffoldBackgroundColor: slate950,
      appBarTheme: const AppBarTheme(
        backgroundColor: slate950,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: slate50,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
        iconTheme: IconThemeData(color: slate400),
      ),
      drawerTheme: const DrawerThemeData(
        backgroundColor: slate900,
      ),
      dividerTheme: const DividerThemeData(
        color: slate700,
      ),
    );
  }

  // Backward compatibility aliases if needed
  static const Color zinc950_bg = slate950;
  static const Color indigo50 = Color(0xFFEEF2FF);
  static const Color indigo950 = slate950;
}
