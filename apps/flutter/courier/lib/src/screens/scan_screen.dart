import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Skanerlash natijasi: ekranda nima ko'rsatiladi va yopiladimi.
class ScanOutcome {
  const ScanOutcome.ok(this.message) : success = true, close = false;
  const ScanOutcome.error(this.message) : success = false, close = false;

  /// Ekran yopiladi va [ScanScreen] chaqiruvchiga skanerlangan matnni qaytaradi.
  const ScanOutcome.done() : message = null, success = true, close = true;

  final String? message;
  final bool success;
  final bool close;
}

/// Kamera ko'rinishi — testda almashtiriladi (widget testida kamera yo'q).
typedef ScannerCameraBuilder = Widget Function(
  BuildContext context,
  void Function(String raw) onCode,
);

/// QR skaner (ADR 0017): posilka yorlig'i yoki mijozning topshirish kodi.
///
/// Kamera butun ekranda, pastda kodni qo'lda kiritish — yorliq yirtilgan yoki
/// kamera ishlamasa ham kuryer to'xtab qolmasin. [onDetect] har o'qishda
/// chaqiriladi; ketma-ket o'nta posilka olinayotganda ekran ochiq qoladi.
class ScanScreen extends StatefulWidget {
  const ScanScreen({
    super.key,
    required this.title,
    required this.onDetect,
    this.manualHintKey = 'courier.manualHint',
    this.manualSubmitKey = 'courier.manualSubmit',
    this.manualDigitsOnly = false,
  });

  @visibleForTesting
  static ScannerCameraBuilder cameraBuilder = _realCamera;

  final String title;
  final Future<ScanOutcome> Function(String raw) onDetect;
  final String manualHintKey;
  final String manualSubmitKey;

  /// Qo'lda kiritishda faqat raqam klaviaturasi (4 xonali kod).
  final bool manualDigitsOnly;

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

Widget _realCamera(BuildContext context, void Function(String raw) onCode) =>
    _CameraView(onCode: onCode);

class _ScanScreenState extends State<ScanScreen> {
  final _manual = TextEditingController();
  bool _busy = false;
  ScanOutcome? _last;

  /// Bir xil QR kamera oldida turganda qayta-qayta yuborilmasin.
  String? _lastRaw;
  DateTime _lastAt = DateTime.fromMillisecondsSinceEpoch(0);

  @override
  void dispose() {
    _manual.dispose();
    super.dispose();
  }

  Future<void> _handle(String raw) async {
    final value = raw.trim();
    if (value.isEmpty || _busy) return;
    final now = DateTime.now();
    if (value == _lastRaw && now.difference(_lastAt) < const Duration(seconds: 3)) return;
    _lastRaw = value;
    _lastAt = now;

    setState(() => _busy = true);
    final outcome = await widget.onDetect(value);
    if (!mounted) return;
    if (outcome.close) {
      Navigator.of(context).pop(value);
      return;
    }
    setState(() {
      _busy = false;
      _last = outcome;
    });
    if (outcome.success) _manual.clear();
  }

  @override
  Widget build(BuildContext context) {
    final last = _last;
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(widget.title),
      ),
      body: Column(
        children: [
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                ScanScreen.cameraBuilder(context, _handle),
                const _Reticle(),
                Positioned(
                  left: 24,
                  right: 24,
                  bottom: 20,
                  child: Text(
                    context.t('courier.scanHint'),
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white, fontSize: 13.5),
                  ),
                ),
                if (_busy) const Center(child: CircularProgressIndicator(color: Colors.white)),
              ],
            ),
          ),
          Material(
            color: Colors.white,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (last?.message != null) ...[
                      _ResultLine(outcome: last!),
                      const SizedBox(height: 12),
                    ],
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _manual,
                            enabled: !_busy,
                            keyboardType: widget.manualDigitsOnly
                                ? TextInputType.number
                                : TextInputType.text,
                            maxLength: widget.manualDigitsOnly ? 4 : 14,
                            textCapitalization: TextCapitalization.characters,
                            decoration: InputDecoration(
                              hintText: context.t(widget.manualHintKey),
                              counterText: '',
                              isDense: true,
                            ),
                            onSubmitted: _handle,
                          ),
                        ),
                        const SizedBox(width: 10),
                        FilledButton(
                          // Mavzudagi tugma butun kenglikda — qatorda o'z o'lchami kerak.
                          style: FilledButton.styleFrom(minimumSize: const Size(0, 48)),
                          onPressed: _busy ? null : () => _handle(_manual.text),
                          child: Text(context.t(widget.manualSubmitKey)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ResultLine extends StatelessWidget {
  const _ResultLine({required this.outcome});

  final ScanOutcome outcome;

  @override
  Widget build(BuildContext context) {
    final color = outcome.success ? SellobayColors.success : SellobayColors.destructive;
    return Row(
      children: [
        Icon(outcome.success ? Icons.check_circle : Icons.error_outline, color: color, size: 20),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            outcome.message!,
            style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 14),
          ),
        ),
      ],
    );
  }
}

/// Ramka: to'rtta bordo burchak. Kamera ochiq qoladi — ramka faqat yo'naltiradi.
class _Reticle extends StatelessWidget {
  const _Reticle();

  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: Center(
      child: SizedBox.square(dimension: 236, child: CustomPaint(painter: _CornersPainter())),
    ),
  );
}

class _CornersPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    const len = 34.0;
    final paint = Paint()
      ..color = SellobayColors.accent
      ..strokeWidth = 5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    final w = size.width;
    final h = size.height;
    final path = Path()
      ..moveTo(0, len)
      ..lineTo(0, 0)
      ..lineTo(len, 0)
      ..moveTo(w - len, 0)
      ..lineTo(w, 0)
      ..lineTo(w, len)
      ..moveTo(w, h - len)
      ..lineTo(w, h)
      ..lineTo(w - len, h)
      ..moveTo(len, h)
      ..lineTo(0, h)
      ..lineTo(0, h - len);
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Haqiqiy kamera: faqat QR, chiroq tugmasi bilan.
class _CameraView extends StatefulWidget {
  const _CameraView({required this.onCode});

  final void Function(String raw) onCode;

  @override
  State<_CameraView> createState() => _CameraViewState();
}

class _CameraViewState extends State<_CameraView> {
  final _controller = MobileScannerController(formats: const [BarcodeFormat.qrCode]);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Stack(
    fit: StackFit.expand,
    children: [
      MobileScanner(
        controller: _controller,
        onDetect: (capture) {
          for (final code in capture.barcodes) {
            final raw = code.rawValue;
            if (raw != null && raw.isNotEmpty) {
              widget.onCode(raw);
              return;
            }
          }
        },
        errorBuilder: (context, error) => Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Text(
              context.t('courier.cameraDenied'),
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.4),
            ),
          ),
        ),
      ),
      Positioned(
        top: 12,
        right: 12,
        child: IconButton.filledTonal(
          tooltip: context.t('courier.torch'),
          onPressed: () => _controller.toggleTorch(),
          icon: const Icon(Icons.flashlight_on_outlined),
        ),
      ),
    ],
  );
}
