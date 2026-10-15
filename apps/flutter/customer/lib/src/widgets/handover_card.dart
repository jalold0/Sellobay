import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Topshirish kodi (ADR 0017) — kuryer yo'lda bo'lganda buyurtma sahifasida.
///
/// Kuryer QR'ni skanerlaydi yoki 4 raqamni so'raydi. Raqamlar yirik Playfair
/// bilan: telefonni uzatmasdan, ovoz chiqarib o'qish oson bo'lsin. Kesik chiziqli
/// hoshiya — «chipta qirqimi»: buni posilka evaziga beriladi.
class HandoverCard extends StatelessWidget {
  const HandoverCard({super.key, required this.handover});

  final OrderHandover handover;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _DashedBorder(),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // QR fon doim OQ — qorong'i rejimda ham kamera o'qiy olsin.
            Container(
              color: Colors.white,
              padding: const EdgeInsets.all(6),
              child: QrImageView(
                data: handover.qrPayload,
                size: 118,
                padding: EdgeInsets.zero,
                errorCorrectionLevel: QrErrorCorrectLevel.M,
                semanticsLabel: context.t('handover.qrAlt'),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.t('handover.title'),
                    style: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: SellobayColors.ink,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    context.t('handover.codeLabel'),
                    style: const TextStyle(fontSize: 11.5, color: SellobayColors.mutedText),
                  ),
                  Semantics(
                    label: handover.pin.split('').join(' '),
                    child: ExcludeSemantics(
                      child: Text(
                        handover.pin,
                        style: const TextStyle(
                          fontFamily: SellobayType.serif,
                          fontSize: 38,
                          height: 1.1,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 8,
                          color: SellobayColors.primary,
                          // Tekis (lining) raqamlar: Playfair'ning eski uslubdagi 4 i pastga tushadi.
                          fontFeatures: [FontFeature.tabularFigures(), FontFeature('lnum')],
                        ),
                      ),
                    ),
                  ),
                  if (handover.parcelCode.isNotEmpty)
                    Text(
                      context.t('handover.parcel', params: {'code': handover.parcelCode}),
                      style: const TextStyle(fontSize: 11.5, color: SellobayColors.mutedText),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Hint matni kartadan TASHQARIDA — kartaning o'zi ixcham qolsin.
class HandoverHint extends StatelessWidget {
  const HandoverHint({super.key});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 8),
    child: Text(
      context.t('handover.hint'),
      style: const TextStyle(fontSize: 12, height: 1.4, color: SellobayColors.mutedText),
    ),
  );
}

class _DashedBorder extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final rrect = RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(14));
    final fill = Paint()..color = SellobayColors.soft;
    canvas.drawRRect(rrect, fill);
    final stroke = Paint()
      ..color = SellobayColors.primary.withValues(alpha: 0.45)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    final path = Path()..addRRect(rrect);
    for (final metric in path.computeMetrics()) {
      for (double d = 0; d < metric.length; d += 10) {
        canvas.drawPath(metric.extractPath(d, d + 5), stroke);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
