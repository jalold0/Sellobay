import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Xaritadagi topshirish punkti belgisi.
///
/// NEGA ALOHIDA FAYL: `SellobayMap` umumiy vidjet bo'lib qolsin —
/// u belgi qanday ko'rinishini bilmasligi kerak. Punktga xos ko'rinish
/// shu yerda, manzil tanlashdagi pin esa o'z joyida.
///
/// Belgida UCHTA narsa bor va uchalasi ham kerak:
///   • brend rangidagi pin — xaritada darhol ajralib turadi;
///   • ichida «S» — bu bizning punktimiz, boshqa kompaniyaniki emas;
///   • ostida qisqa kod (`TAS-001`) — bir shaharda bir nechta punkt
///     bo'lganda qaysi biri ekanini ro'yxat bilan solishtirish uchun.
class PickupMarker extends StatelessWidget {
  const PickupMarker({super.key, required this.code, this.selected = false});

  /// To'liq kod — `PVZ-TAS-001`.
  final String code;

  final bool selected;

  /// `PVZ-TAS-001` -> `TAS-001`.
  ///
  /// Tur prefiksi (`PVZ`) tashlanadi: u hamma punktda bir xil va
  /// belgida joy egallaydi. Format kutilganidek bo'lmasa, kod butunlay
  /// ko'rsatiladi — qisqartirishga urinib, bo'sh satr chiqarmaymiz.
  static String shortCode(String code) {
    final parts = code.split('-');
    return parts.length >= 3 ? parts.sublist(1).join('-') : code;
  }

  @override
  Widget build(BuildContext context) {
    final color = selected ? SellobayColors.destructive : SellobayColors.primary;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 30,
          height: 34,
          child: Stack(
            alignment: Alignment.topCenter,
            children: [
              Icon(Icons.location_on, size: 34, color: color),
              // Pinning yumaloq qismi markazida — shuning uchun
              // yuqoridan biroz suriladi.
              Positioned(
                top: 6,
                child: Container(
                  width: 15,
                  height: 15,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    'S',
                    style: TextStyle(
                      fontSize: 10,
                      height: 1,
                      fontWeight: FontWeight.w900,
                      color: color,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: color, width: 0.8),
          ),
          child: Text(
            shortCode(code),
            style: TextStyle(
              fontSize: 8.5,
              height: 1.1,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ),
      ],
    );
  }
}
