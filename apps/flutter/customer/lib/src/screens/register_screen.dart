import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Email + parol bilan ro'yxatdan o'tish.
///
/// Telefon bu yerda SO'RALMAYDI: telefon bilan hisob OTP oqimida
/// avtomatik yaratiladi (`otp/verify`). Ikkinchi yo'l qo'shsak, bir xil
/// natijaga olib boradigan ikkita forma bo'lardi.
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();

  bool _accepted = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final emailIssue = emailIssueKey(_email.text);
    if (emailIssue != null) {
      setState(() => _error = context.t(emailIssue));
      return;
    }
    // Parol qoidasi serverdagi zod sxemasining nusxasi — foydalanuvchi
    // "Ro'yxatdan o'tish" ni bosib, 400 kutib o'tirmasligi uchun.
    final passwordIssue = passwordIssueKey(_password.text);
    if (passwordIssue != null) {
      setState(() => _error = context.t(passwordIssue));
      return;
    }
    if (!_accepted) {
      setState(() => _error = context.t('auth.acceptWarning'));
      return;
    }

    final auth = AuthScope.read(context);
    final locale = SellobayRuntimeScope.of(context).locale.locale;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final outcome = await auth.register(
        email: _email.text,
        password: _password.text,
        firstName: _firstName.text,
        lastName: _lastName.text,
        // Hisob ilova ishlayotgan tilda yaratiladi — keyin web ham shu
        // tilda ochiladi.
        locale: locale,
      );
      if (!mounted) return;
      if (outcome.pendingApproval) {
        // Mijoz uchun bu holat yuz bermaydi (faqat sotuvchi arizasida),
        // lekin javobni ko'r-ko'rona "kirdik" deb o'qimaymiz.
        setState(() {
          _busy = false;
          _error = context.t('auth.sellerAppliedHint');
        });
        return;
      }
      Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = context.errorText(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
          child: AutofillGroup(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  context.t('auth.registerTitle'),
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: SellobayColors.ink,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  context.t('auth.registerSubtitle'),
                  style: const TextStyle(fontSize: 14, color: SellobayColors.mutedText),
                ),
                const SizedBox(height: 26),
                FormErrorBanner(_error),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _firstName,
                        enabled: !_busy,
                        textCapitalization: TextCapitalization.words,
                        autofillHints: const [AutofillHints.givenName],
                        decoration: InputDecoration(labelText: context.t('auth.firstName')),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _lastName,
                        enabled: !_busy,
                        textCapitalization: TextCapitalization.words,
                        autofillHints: const [AutofillHints.familyName],
                        decoration: InputDecoration(labelText: context.t('auth.lastName')),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _email,
                  enabled: !_busy,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.newUsername],
                  decoration: InputDecoration(
                    labelText: context.t('auth.email'),
                    hintText: context.t('auth.emailPlaceholder'),
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _password,
                  enabled: !_busy,
                  obscureText: true,
                  autofillHints: const [AutofillHints.newPassword],
                  decoration: InputDecoration(
                    labelText: context.t('auth.password'),
                    hintText: context.t('auth.passwordPlaceholder'),
                    helperText: context.t('auth.passwordHint'),
                    helperMaxLines: 2,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  context.t('auth.passwordSecure'),
                  style: const TextStyle(
                    fontSize: 11.5,
                    height: 1.5,
                    color: SellobayColors.mutedText,
                  ),
                ),
                const SizedBox(height: 14),
                _termsCheckbox(context),
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: _busy ? null : _submit,
                  child: _busy
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                        )
                      : Text(context.t('auth.registerSubmit')),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      context.t('auth.haveAccount'),
                      style: const TextStyle(fontSize: 13.5, color: SellobayColors.mutedText),
                    ),
                    TextButton(
                      onPressed: _busy ? null : () => Navigator.of(context).pop(),
                      child: Text(context.t('auth.loginLink')),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _termsCheckbox(BuildContext context) {
    final label = [
      context.t('auth.acceptTermsPrefix'),
      context.t('auth.termsLinkLower'),
      context.t('auth.acceptTermsMid'),
      context.t('auth.privacyLinkLower'),
      context.t('auth.acceptTermsSuffix'),
    ].join(' ');

    return InkWell(
      onTap: _busy ? null : () => setState(() => _accepted = !_accepted),
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Checkbox(
              value: _accepted,
              onChanged: _busy ? null : (v) => setState(() => _accepted = v ?? false),
            ),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(fontSize: 12.5, height: 1.4, color: SellobayColors.ink),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
