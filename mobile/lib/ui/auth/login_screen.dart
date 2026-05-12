import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../providers/user_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();

  bool _isRegisterMode = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final result = _isRegisterMode
        ? await ref
              .read(authProvider.notifier)
              .register(
                name: _nameController.text,
                email: _emailController.text,
                password: _passwordController.text,
                confirmPassword: _confirmPasswordController.text,
              )
        : await ref
              .read(authProvider.notifier)
              .login(
                email: _emailController.text,
                password: _passwordController.text,
              );

    if (!mounted) return;
    _handleAuthResult(result);
  }

  Future<void> _handleGoogleLogin() async {
    final result = await ref.read(authProvider.notifier).signInWithGoogle();
    if (!mounted) return;
    _handleAuthResult(result);
  }

  void _handleAuthResult(AuthResult result) {
    if (!result.isSuccess) {
      _showSnack(result.error ?? 'Autentikasi gagal.');
      return;
    }

    Navigator.pushReplacementNamed(context, '/workspace');
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  void _toggleMode() {
    setState(() {
      _isRegisterMode = !_isRegisterMode;
      _confirmPasswordController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    final authState = ref.watch(authProvider);
    final primaryColor = isDark ? AppTheme.blue300 : AppTheme.blue600;

    return Scaffold(
      backgroundColor: isDark ? AppTheme.slate950 : Colors.white,
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildHeader(isDark),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _isRegisterMode
                        ? 'Buat akun baru'
                        : 'Selamat datang kembali',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : AppTheme.slate950,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _isRegisterMode
                        ? 'Daftar untuk masuk ke workspace tim kamu'
                        : 'Masuk ke workspace tim kamu',
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? AppTheme.slate400 : AppTheme.slate500,
                    ),
                  ),
                  const SizedBox(height: 32),
                  if (_isRegisterMode) ...[
                    _buildLabel('Nama user', isDark),
                    const SizedBox(height: 8),
                    _buildTextField(
                      controller: _nameController,
                      hintText: 'Nama kamu',
                      isDark: isDark,
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 20),
                  ],
                  _buildLabel('Email', isDark),
                  const SizedBox(height: 8),
                  _buildTextField(
                    controller: _emailController,
                    hintText: 'nama@email.com',
                    isDark: isDark,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 20),
                  _buildPasswordLabel(isDark, primaryColor),
                  _buildTextField(
                    controller: _passwordController,
                    hintText: 'Masukkan kata sandi',
                    isDark: isDark,
                    obscureText: _obscurePassword,
                    textInputAction: _isRegisterMode
                        ? TextInputAction.next
                        : TextInputAction.done,
                    onSubmitted: (_) {
                      if (!_isRegisterMode) _submit();
                    },
                    suffixIcon: IconButton(
                      onPressed: () {
                        setState(() => _obscurePassword = !_obscurePassword);
                      },
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_off
                            : Icons.visibility,
                        color: isDark ? AppTheme.slate400 : AppTheme.slate500,
                      ),
                    ),
                  ),
                  if (_isRegisterMode) ...[
                    const SizedBox(height: 20),
                    _buildLabel('Konfirmasi kata sandi', isDark),
                    const SizedBox(height: 8),
                    _buildTextField(
                      controller: _confirmPasswordController,
                      hintText: 'Ulangi kata sandi',
                      isDark: isDark,
                      obscureText: _obscureConfirmPassword,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _submit(),
                      suffixIcon: IconButton(
                        onPressed: () {
                          setState(
                            () => _obscureConfirmPassword =
                                !_obscureConfirmPassword,
                          );
                        },
                        icon: Icon(
                          _obscureConfirmPassword
                              ? Icons.visibility_off
                              : Icons.visibility,
                          color: isDark ? AppTheme.slate400 : AppTheme.slate500,
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: authState.isLoading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        foregroundColor: isDark ? AppTheme.slate950 : Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        elevation: 0,
                      ),
                      child: authState.isLoading
                          ? SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: isDark ? AppTheme.slate950 : Colors.white,
                              ),
                            )
                          : Text(
                              _isRegisterMode ? 'Daftar' : 'Masuk',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  _buildDivider(isDark),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: OutlinedButton(
                      onPressed: authState.isLoading
                          ? null
                          : _handleGoogleLogin,
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(
                          color: isDark
                              ? AppTheme.slate700
                              : AppTheme.slate200,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.g_mobiledata, size: 26, color: primaryColor),
                          const SizedBox(width: 10),
                          Flexible(
                            child: Text(
                              _isRegisterMode
                                  ? 'Daftar dengan Google'
                                  : 'Masuk dengan Google',
                              style: TextStyle(
                                color: isDark
                                    ? AppTheme.slate200
                                    : AppTheme.slate700,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  Center(
                    child: Wrap(
                      alignment: WrapAlignment.center,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          _isRegisterMode
                              ? 'Sudah punya akun? '
                              : 'Belum punya akun? ',
                          style: TextStyle(
                            color: isDark ? AppTheme.slate400 : AppTheme.slate500,
                            fontSize: 13,
                          ),
                        ),
                        GestureDetector(
                          onTap: _toggleMode,
                          child: Text(
                            _isRegisterMode
                                ? 'Masuk sekarang'
                                : 'Daftar sekarang',
                            style: TextStyle(
                              color: primaryColor,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.slate900 : AppTheme.slate950,
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: isDark ? AppTheme.blue300 : AppTheme.blue600,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: GridView.count(
                      crossAxisCount: 2,
                      padding: const EdgeInsets.all(8),
                      mainAxisSpacing: 3,
                      crossAxisSpacing: 3,
                      children: [
                        _logoDot(1),
                        _logoDot(0.6),
                        _logoDot(0.6),
                        _logoDot(0.3),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'RuangKolaborasi',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                ],
              ),
              IconButton(
                onPressed: () => ref.read(themeProvider.notifier).toggleTheme(),
                icon: Icon(
                  isDark ? Icons.light_mode : Icons.dark_mode,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 40),
          const Text(
            'Satu ruang untuk\nsemua diskusi tim.',
            style: TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.bold,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Chat, bagikan file, dan rangkum diskusi dengan bantuan AI.',
            style: TextStyle(
              color: Colors.white.withOpacity(0.5),
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLabel(String label, bool isDark) {
    return Text(
      label,
      style: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: isDark ? AppTheme.slate200 : AppTheme.slate700,
      ),
    );
  }

  Widget _buildPasswordLabel(bool isDark, Color primaryColor) {
    if (_isRegisterMode) return _buildLabel('Kata sandi', isDark);

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _buildLabel('Kata sandi', isDark),
        TextButton(
          onPressed: () => _showSnack('Fitur lupa kata sandi belum tersedia.'),
          child: Text(
            'Lupa kata sandi?',
            style: TextStyle(fontSize: 12, color: primaryColor),
          ),
        ),
      ],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hintText,
    required bool isDark,
    bool obscureText = false,
    TextInputType? keyboardType,
    TextInputAction? textInputAction,
    ValueChanged<String>? onSubmitted,
    Widget? suffixIcon,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      onSubmitted: onSubmitted,
      style: TextStyle(color: isDark ? Colors.white : Colors.black),
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: TextStyle(
          color: isDark ? AppTheme.slate400 : AppTheme.slate500,
        ),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: isDark ? AppTheme.slate800 : AppTheme.slate50,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(
            color: isDark ? AppTheme.slate700 : AppTheme.slate200,
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(
            color: isDark ? AppTheme.slate700 : AppTheme.slate200,
          ),
        ),
      ),
    );
  }

  Widget _buildDivider(bool isDark) {
    return Row(
      children: [
        Expanded(
          child: Divider(
            color: isDark ? AppTheme.slate700 : AppTheme.slate200,
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'atau',
            style: TextStyle(
              color: isDark ? AppTheme.slate400 : AppTheme.slate500,
              fontSize: 12,
            ),
          ),
        ),
        Expanded(
          child: Divider(
            color: isDark ? AppTheme.slate700 : AppTheme.slate200,
          ),
        ),
      ],
    );
  }

  Widget _logoDot(double opacity) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(opacity),
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }
}
