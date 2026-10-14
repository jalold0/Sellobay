import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../../auth_flow.dart';
import '../../screens/notifications_screen.dart';

/// Sarlavhadagi qo'ng'iroq: o'qilmagan bildirishnomalar soni bilan.
///
/// Son bosh sahifa yuklanganda va bildirishnomalar ekranidan
/// qaytilganda yangilanadi. Mehmonda son so'ralmaydi (401 bo'lardi),
/// bosilsa ekran kirishni taklif qiladi.
class NotificationBell extends StatefulWidget {
  const NotificationBell({super.key, this.refreshToken = 0});

  /// O'zgarsa son qayta so'raladi (masalan, tortib yangilashda).
  final int refreshToken;

  @override
  State<NotificationBell> createState() => _NotificationBellState();
}

class _NotificationBellState extends State<NotificationBell> {
  int _unread = 0;
  AuthStatus? _status;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final status = AuthScope.of(context).status;
    if (status == _status) return;
    _status = status;
    if (status == AuthStatus.signedIn) {
      _refresh();
    } else {
      _unread = 0;
    }
  }

  @override
  void didUpdateWidget(NotificationBell oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshToken != widget.refreshToken) _refresh();
  }

  Future<void> _refresh() async {
    if (isGuest(AuthScope.read(context))) return;
    try {
      final count = await SellobayRuntimeScope.of(context).notifications.fetchUnreadCount();
      if (mounted) setState(() => _unread = count);
    } catch (_) {
      // Son ko'rinmay qolsa ham sahifa ishlaydi — keyingi yangilashda.
    }
  }

  Future<void> _open() async {
    final left = await Navigator.of(context).push<int?>(
      MaterialPageRoute(builder: (_) => const NotificationsScreen()),
    );
    if (!mounted) return;
    if (left != null) {
      setState(() => _unread = left);
    } else {
      _refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final label = _unread > 99 ? '99+' : '$_unread';
    return IconButton(
      tooltip: context.t('notifications.title'),
      onPressed: _open,
      icon: Badge(
        isLabelVisible: _unread > 0,
        label: Text(label),
        backgroundColor: SellobayColors.primary,
        child: const Icon(Icons.notifications_none),
      ),
    );
  }
}
