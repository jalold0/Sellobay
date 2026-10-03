import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// SMS kodni tasdiqlash.
///
/// Bu ekran HAM KIRISH, HAM RO'YXATDAN O'TISH yakuni: server telefonni
/// birinchi marta ko'rsa hisobni o'zi yaratadi (`otp/verify` route'i).
class OtpScreen extends StatefulWidget {
  const OtpScreen({super.key, required this.challenge});

  final OtpChallenge challenge;

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _code = TextEditingController();

  Timer? _ticker;
  late int _resendIn;
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    // Kutish vaqti SERVERDAN keladi (`OTP_RESEND_COOLDOWN_SEC`), bu yerda
    // yozilmagan — qoidani server qo'llaydi.
    _resendIn = widget.challenge.resendAfterSec;
    _startTicker();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _code.dispose();
    super.dispose();
  }

  void _startCountdown(int seconds) {
    setState(() => _resendIn = seconds);
    _startTicker();
  }

  void _startTicker() {
    _ticker?.cancel();
    if (_resendIn <= 0) return;
    _ticker = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return timer.cancel();
      setState(() => _resendIn--);
      if (_resendIn <= 0) timer.cancel();
    });
  }

  Future<void> _verify() async {
    final issue = otpCodeIssueKey(_code.text);
    if (issue != null) {
      setState(() => _error = context.t(issue));
      return;
    }
    final auth = AuthScope.read(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await auth.signInWithOtp(phone: widget.challenge.phone, code: _code.text);
      if (!mounted) return;
      // Ildizga qaytamiz: `AuthGate` endi bosh ekranni ko'rsatadi.
      // Bo'lmasa bu ekran bosh sahifa ustida osilib qolardi.
      Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = context.errorText(e);
      });
    }
  }

  Future<void> _resend() async {
    if (_resendIn > 0) return;
    final repo = SellobayRuntimeScope.of(context).repository;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final next = await repo.sendOtp(widget.challenge.phone);
      if (!mounted) return;
      setState(() => _busy = false);
      _startCountdown(next.resendAfterSec);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.t('auth.codeResent'))),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = context.errorText(e);
      });
      // 429 bo'lsa server qancha kutishni aytadi — hisoblagichni shunga
      // qo'yamiz. Sarlavha bo'lmasa oldingi qiymatni qaytaramiz, o'zimiz
      // raqam o'ylab topmaymiz.
      if (e.isRateLimited) {
        _startCountdown(e.retryAfterSec ?? widget.challenge.resendAfterSec);
      }
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
    final pretty = formatUzPhone(widget.challenge.phone) ?? widget.challenge.phone;

    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                context.t('auth.codeLabel'),
                style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: SellobayColors.ink,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                context.t('auth.codeSentTo', params: {'phone': pretty}),
                style: const TextStyle(fontSize: 14, color: SellobayColors.mutedText),
              ),
              const SizedBox(height: 28),
              FormErrorBanner(_error),
              TextField(
                controller: _code,
                autofocus: true,
                enabled: !_busy,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                maxLength: 6,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                autofillHints: const [AutofillHints.oneTimeCode],
                style: const TextStyle(fontSize: 26, letterSpacing: 10, fontWeight: FontWeight.w600),
                decoration: const InputDecoration(counterText: '', hintText: '······'),
                onChanged: (value) {
                  // Oltinchi raqam kiritilishi bilan o'zi yuboriladi —
                  // kodni ko'chirib qo'yganda ortiqcha bosish kerak emas.
                  if (value.length == 6 && !_busy) _verify();
                },
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _busy ? null : _verify,
                child: _busy
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                      )
                    : Text(context.t('auth.verify')),
              ),
              const SizedBox(height: 10),
              TextButton(
                onPressed: _busy || _resendIn > 0 ? null : _resend,
                child: Text(
                  _resendIn > 0
                      ? context.t('auth.resendIn', params: {'seconds': _resendIn})
                      : context.t('auth.resend'),
                ),
              ),
              TextButton(
                onPressed: _busy ? null : () => Navigator.of(context).pop(),
                child: Text(context.t('auth.changePhone')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
