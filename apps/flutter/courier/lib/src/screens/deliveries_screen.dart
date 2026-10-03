import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Kuryerning bugungi topshiriqlari.
///
/// RO'YXAT HOZIRCHA YO'Q va soxta buyurtmalar ko'rsatilmaydi. Expo
/// variantida bu ekranda `DELIVERIES` degan qotib yozilgan ikkita
/// buyurtma turardi ("ORD-2026-00001234", "Yunusobod") — real yetkazish
/// API'si esa umuman yozilmagan. Shunday ekran sinovda "ishlayapti"
/// degan taassurot qoldiradi.
///
/// Yetkazishlar API'si (`/api/courier/deliveries`) yozilgach shu yer
/// to'ldiriladi.
class DeliveriesScreen extends StatelessWidget {
  const DeliveriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = AuthScope.of(context).user;

    return Scaffold(
      appBar: AppBar(
        title: Text(context.t('courier.deliveriesTitle')),
        actions: [
          IconButton(
            tooltip: context.t('profile.signOut'),
            onPressed: () => AuthScope.read(context).signOut(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.inventory_2_outlined, size: 44, color: SellobayColors.mutedText),
              const SizedBox(height: 16),
              if (user != null)
                Text(
                  user.displayName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: SellobayColors.ink,
                  ),
                ),
              const SizedBox(height: 8),
              Text(
                context.t('common.notConnectedYet'),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13.5, color: SellobayColors.mutedText),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
