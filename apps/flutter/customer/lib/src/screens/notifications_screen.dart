import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../auth_flow.dart';
import '../home_tabs.dart';

/// Ilova ichidagi bildirishnomalar.
///
/// Ochilganda ro'yxat O'QILDI deb belgilanmaydi — faqat bosilgan xabar
/// yoki «Hammasini o'qildi» bilan. Aks holda ekranni tasodifan ochgan
/// odam muhim xabarni ko'rmasdan yo'qotib qo'yardi.
///
/// Natija: qolgan o'qilmaganlar soni (qo'ng'iroq belgisi yangilanishi
/// uchun); o'zgarmagan bo'lsa `null`.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final List<AppNotification> _items = [];
  String? _cursor;
  int _unread = 0;
  bool _loading = true;
  bool _loadingMore = false;
  Object? _error;
  bool _changed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !isGuest(AuthScope.read(context))) _load();
    });
  }

  NotificationsRepository get _repo => SellobayRuntimeScope.of(context).notifications;

  Future<void> _load() async {
    setState(() {
      _loading = _items.isEmpty;
      _error = null;
    });
    try {
      final page = await _repo.fetchPage();
      if (!mounted) return;
      setState(() {
        _items
          ..clear()
          ..addAll(page.items);
        _cursor = page.nextCursor;
        _unread = page.unreadCount;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e;
      });
    }
  }

  Future<void> _loadMore() async {
    final cursor = _cursor;
    if (cursor == null || _loadingMore) return;
    setState(() => _loadingMore = true);
    try {
      final page = await _repo.fetchPage(cursor: cursor);
      if (!mounted) return;
      setState(() {
        _items.addAll(page.items);
        _cursor = page.nextCursor;
        _unread = page.unreadCount;
        _loadingMore = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingMore = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.errorText(e))));
    }
  }

  Future<void> _open(int index) async {
    final item = _items[index];
    if (!item.read) {
      // Darhol ko'rinadi; server javobi sonni aniqlaydi. Xato bo'lsa
      // ham o'tish to'xtamaydi — keyingi ochilishda holat serverdan.
      setState(() {
        _items[index] = item.markedRead();
        _unread = (_unread - 1).clamp(0, _unread);
        _changed = true;
      });
      _repo.markRead([item.id]).then((left) {
        if (mounted) setState(() => _unread = left);
      }, onError: (Object _) {});
    }
    if (item.orderNumber != null) {
      // Buyurtma haqidagi xabar — Buyurtmalar bo'limiga.
      HomeTabsScope.read(context)?.go(HomeTab.orders);
      Navigator.of(context).pop(_unread);
    }
  }

  Future<void> _markAll() async {
    try {
      final left = await _repo.markAllRead();
      if (!mounted) return;
      setState(() {
        for (var i = 0; i < _items.length; i++) {
          if (!_items[i].read) _items[i] = _items[i].markedRead();
        }
        _unread = left;
        _changed = true;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.errorText(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final guest = isGuest(AuthScope.of(context));
    return PopScope<Object?>(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) Navigator.of(context).pop(_changed ? _unread : null);
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(context.t('notifications.title')),
          actions: [
            if (!guest && _unread > 0)
              IconButton(
                tooltip: context.t('notifications.markAllRead'),
                icon: const Icon(Icons.done_all),
                onPressed: _markAll,
              ),
          ],
        ),
        body: guest
            ? GuestPrompt(
                icon: Icons.notifications_none,
                title: context.t('notifications.loginTitle'),
                message: context.t('notifications.loginHint'),
              )
            : RefreshIndicator(onRefresh: _load, child: _body(context)),
      ),
    );
  }

  Widget _body(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: SellobayColors.primary));
    }
    if (_error != null) {
      return _message(
        icon: Icons.cloud_off,
        title: context.errorText(_error!),
        action: FilledButton(onPressed: _load, child: Text(context.t('common.retry'))),
      );
    }
    if (_items.isEmpty) {
      return _message(
        icon: Icons.notifications_none,
        title: context.t('notifications.empty'),
        subtitle: context.t('notifications.emptyHint'),
      );
    }
    return NotificationListener<ScrollNotification>(
      onNotification: (n) {
        if (n.metrics.extentAfter < 300) _loadMore();
        return false;
      },
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 24),
        itemCount: _items.length + (_loadingMore ? 1 : 0),
        separatorBuilder: (_, _) => const Divider(height: 1, indent: 64),
        itemBuilder: (context, index) {
          if (index >= _items.length) {
            return const Padding(
              padding: EdgeInsets.all(20),
              child: Center(
                child: SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2.2, color: SellobayColors.primary),
                ),
              ),
            );
          }
          return _tile(context, index);
        },
      ),
    );
  }

  Widget _tile(BuildContext context, int index) {
    final item = _items[index];
    return InkWell(
      onTap: () => _open(index),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: item.read ? SellobayColors.soft : SellobayColors.primary.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(
                item.orderNumber != null ? Icons.local_shipping_outlined : Icons.notifications_none,
                size: 19,
                color: item.read ? SellobayColors.mutedText : SellobayColors.primary,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          item.title,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: item.read ? FontWeight.w500 : FontWeight.w700,
                            color: SellobayColors.ink,
                          ),
                        ),
                      ),
                      if (!item.read)
                        Semantics(
                          label: context.t('notifications.unread'),
                          child: Container(
                            width: 8,
                            height: 8,
                            margin: const EdgeInsets.only(left: 8, top: 6),
                            decoration: const BoxDecoration(
                              color: SellobayColors.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    item.body,
                    style: const TextStyle(fontSize: 13.5, height: 1.4, color: SellobayColors.mutedText),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    formatOrderDateTime(item.createdAt),
                    style: const TextStyle(fontSize: 12, color: SellobayColors.mutedText),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _message({
    required IconData icon,
    required String title,
    String? subtitle,
    Widget? action,
  }) =>
      ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(32),
        children: [
          SizedBox(height: MediaQuery.sizeOf(context).height * 0.16),
          Icon(icon, size: 44, color: SellobayColors.mutedText),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w600, color: SellobayColors.ink),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: SellobayColors.mutedText),
            ),
          ],
          if (action != null) ...[const SizedBox(height: 18), Center(child: action)],
        ],
      );
}
