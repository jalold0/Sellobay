import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Kuryer kirishi.
///
/// Faqat parol bilan va RO'YXATDAN O'TISH YO'Q: kuryer hisobini admin
/// yaratadi va unga `COURIER` rolini beradi. OTP ham berilmagan —
/// `otp/verify` telefonni birinchi marta ko'rsa hisobni O'ZI yaratadi
/// (`CUSTOMER` roli bilan), ya'ni bu yerda u faqat rolsiz hisob yaratib,
/// darhol rad etilishiga olib kelardi.
class CourierLoginScreen extends StatefulWidget {
  const CourierLoginScreen({super.key});

  @override
  State<CourierLoginScreen> createState() => _CourierLoginScreenState();
}

class _CourierLoginScreenState extends State<CourierLoginScreen> {
  final _identifier = TextEditingController();
  final _password = TextEditingController();

  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  /// Ikkala maydon ham to'lgandami. Tugma shunga qarab yoqiladi —
  /// "maydonlarni to'ldiring" degan xabar ko'rsatishdan ko'ra, bosib
  /// bo'lmaydigan tugma tushunarliroq (va yangi tarjima talab qilmaydi).
  bool get _canSubmit => _identifier.text.trim().isNotEmpty && _password.text.isNotEmpty;

  Future<void> _signIn() async {
    if (!_canSubmit) return;
    final auth = AuthScope.read(context);
    auth.clearRoleError();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await auth.signInWithPassword(
        identifier: _identifier.text,
        password: _password.text,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = context.errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = AuthScope.of(context);
    // Rol rad etilgani — kirish xatosi emas, alohida sabab. U
    // `AuthController` da saqlanadi, chunki tekshiruv `me()` dan keyin,
    // ya'ni kirish "muvaffaqiyatli" bo'lgandan keyin yuz beradi.
    final message = auth.roleErrorKey != null ? context.t(auth.roleErrorKey!) : _error;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 48, 24, 32),
          child: AutofillGroup(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.local_shipping_outlined, size: 44, color: SellobayColors.primary),
                const SizedBox(height: 20),
                Text(
                  context.t('courier.loginTitle'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: SellobayColors.ink,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  context.t('courier.loginSubtitle'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 13.5,
                    height: 1.45,
                    color: SellobayColors.mutedText,
                  ),
                ),
                const SizedBox(height: 32),
                FormErrorBanner(message),
                TextField(
                  controller: _identifier,
                  enabled: !_busy,
                  keyboardType: TextInputType.text,
                  autofillHints: const [AutofillHints.username],
                  decoration: InputDecoration(labelText: context.t('auth.identifier')),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _password,
                  enabled: !_busy,
                  obscureText: true,
                  autofillHints: const [AutofillHints.password],
                  decoration: InputDecoration(
                    labelText: context.t('auth.password'),
                    hintText: context.t('auth.passwordPlaceholder'),
                  ),
                  onChanged: (_) => setState(() {}),
                  onSubmitted: (_) {
                    if (!_busy) _signIn();
                  },
                ),
                const SizedBox(height: 22),
                FilledButton(
                  onPressed: _busy || !_canSubmit ? null : _signIn,
                  child: _busy
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                        )
                      : Text(context.t('auth.loginSubmit')),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
