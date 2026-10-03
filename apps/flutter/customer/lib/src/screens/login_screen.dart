import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'otp_screen.dart';
import 'register_screen.dart';

enum _Mode { phone, email }

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();

  _Mode _mode = _Mode.phone;
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _phone.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _switchMode(_Mode mode) {
    setState(() {
      _mode = mode;
      _error = null; // boshqa shakldagi xato yangi formada turib qolmasin
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = context.errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sendCode() async {
    if (!isValidUzPhone(_phone.text)) {
      setState(() => _error = context.t('auth.phoneInvalid'));
      return;
    }
    final repo = SellobayRuntimeScope.of(context).repository;
    setState(() {
      _busy = true;
      _error = null;
    });

    final OtpChallenge challenge;
    try {
      challenge = await repo.sendOtp(_phone.text);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = context.errorText(e);
      });
      return;
    }

    if (!mounted) return;
    // Spinner OTP ekrani ochilishidan OLDIN o'chiriladi: aks holda
    // foydalanuvchi orqaga qaytganda tugma bloklangan holda qolardi.
    setState(() => _busy = false);
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => OtpScreen(challenge: challenge)),
    );
  }

  Future<void> _signIn() async {
    final emailIssue = emailIssueKey(_email.text);
    if (emailIssue != null) {
      setState(() => _error = context.t(emailIssue));
      return;
    }
    if (_password.text.isEmpty) {
      setState(() => _error = context.t('auth.passwordHint'));
      return;
    }
    await _run(() async {
      // Parol qoidasi bu yerda TEKSHIRILMAYDI: eski hisoblarning paroli
      // hozirgi qoidaga mos kelmasligi mumkin va mijoz ularni o'zi
      // rad etib qo'ysa, odam o'z hisobiga kira olmay qolardi.
      await AuthScope.read(context).signInWithPassword(
        identifier: _email.text,
        password: _password.text,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 32, 24, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                context.t('auth.welcomeTitle'),
                style: const TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w700,
                  color: SellobayColors.ink,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                context.t('auth.loginWelcome'),
                style: const TextStyle(
                  fontSize: 14.5,
                  height: 1.45,
                  color: SellobayColors.mutedText,
                ),
              ),
              const SizedBox(height: 28),
              SegmentedButton<_Mode>(
                segments: [
                  ButtonSegment(value: _Mode.phone, label: Text(context.t('auth.tabPhone'))),
                  ButtonSegment(value: _Mode.email, label: Text(context.t('auth.tabEmail'))),
                ],
                selected: {_mode},
                showSelectedIcon: false,
                onSelectionChanged: (s) => _switchMode(s.first),
              ),
              const SizedBox(height: 24),
              FormErrorBanner(_error),
              if (_mode == _Mode.phone) ..._phoneForm(context) else ..._emailForm(context),
              const SizedBox(height: 24),
              _termsNotice(context),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _phoneForm(BuildContext context) => [
        TextField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          autofillHints: const [AutofillHints.telephoneNumber],
          enabled: !_busy,
          decoration: InputDecoration(
            labelText: context.t('auth.phone'),
            hintText: context.t('auth.phonePlaceholder'),
          ),
          onSubmitted: (_) {
            if (!_busy) _sendCode();
          },
        ),
        const SizedBox(height: 10),
        Text(
          context.t('auth.phoneHint'),
          style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText),
        ),
        const SizedBox(height: 20),
        _submitButton(context, label: context.t('auth.getCode'), onPressed: _sendCode),
        const SizedBox(height: 14),
        Text(
          // Telefon bilan kirishda alohida ro'yxatdan o'tish YO'Q: server
          // raqamni birinchi marta ko'rsa hisobni o'zi yaratadi.
          context.t('auth.phoneFirstHint'),
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 12, height: 1.5, color: SellobayColors.mutedText),
        ),
      ];

  List<Widget> _emailForm(BuildContext context) => [
        AutofillGroup(
          child: Column(
            children: [
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.username],
                enabled: !_busy,
                decoration: InputDecoration(
                  labelText: context.t('auth.email'),
                  hintText: context.t('auth.emailPlaceholder'),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _password,
                obscureText: true,
                autofillHints: const [AutofillHints.password],
                enabled: !_busy,
                decoration: InputDecoration(
                  labelText: context.t('auth.password'),
                  hintText: context.t('auth.passwordPlaceholder'),
                ),
                onSubmitted: (_) {
                  if (!_busy) _signIn();
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        _submitButton(context, label: context.t('auth.loginSubmit'), onPressed: _signIn),
        const SizedBox(height: 18),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              context.t('auth.noAccount'),
              style: const TextStyle(fontSize: 13.5, color: SellobayColors.mutedText),
            ),
            TextButton(
              onPressed: _busy
                  ? null
                  : () => Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => const RegisterScreen()),
                      ),
              child: Text(context.t('auth.registerLink')),
            ),
          ],
        ),
      ];

  Widget _submitButton(
    BuildContext context, {
    required String label,
    required Future<void> Function() onPressed,
  }) {
    return FilledButton(
      onPressed: _busy ? null : () => onPressed(),
      child: _busy
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
            )
          : Text(label),
    );
  }

  /// Shartlar haqidagi eslatma.
  ///
  /// Havolalar ATAYLAB bosiladigan qilinmagan: hujjat sahifalarini
  /// ochadigan ekran hali yo'q, bosilmaydigan "havola" esa foydalanuvchini
  /// aldaydi. Matn ko'rinishidagi eslatma rost bo'lib qoladi.
  Widget _termsNotice(BuildContext context) {
    final text = [
      context.t('auth.termsPrefix'),
      context.t('auth.termsLink'),
      context.t('auth.termsJoin'),
      context.t('auth.privacyLink'),
      context.t('auth.termsAgreeSuffix'),
    ].join(' ');
    return Text(
      text,
      textAlign: TextAlign.center,
      style: const TextStyle(fontSize: 11.5, height: 1.5, color: SellobayColors.mutedText),
    );
  }
}
