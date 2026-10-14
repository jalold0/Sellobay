import '../api/api_client.dart';

/// Ilova ichidagi bitta bildirishnoma (`GET /api/notifications`).
class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.read,
    required this.createdAt,
    this.data = const {},
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: json['id'] as String? ?? '',
        title: json['title'] as String? ?? '',
        body: json['body'] as String? ?? '',
        read: json['read'] as bool? ?? false,
        createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '')?.toLocal() ?? DateTime.now(),
        data: (json['data'] as Map<String, dynamic>?) ?? const {},
      );

  final String id;
  final String title;
  final String body;
  final bool read;
  final DateTime createdAt;

  /// Yozuvchi qo'ygan qo'shimcha ma'lumot. Masalan `orderNumber` bo'lsa,
  /// bosilganda o'sha buyurtma ochiladi.
  final Map<String, dynamic> data;

  /// Bog'langan buyurtma raqami — bo'lmasa `null`.
  String? get orderNumber {
    final value = data['orderNumber'];
    return value is String && value.isNotEmpty ? value : null;
  }

  AppNotification markedRead() => AppNotification(
        id: id,
        title: title,
        body: body,
        read: true,
        createdAt: createdAt,
        data: data,
      );
}

/// Bildirishnomalar sahifasi.
class NotificationPage {
  const NotificationPage({
    required this.items,
    required this.unreadCount,
    this.nextCursor,
  });

  factory NotificationPage.fromJson(Map<String, dynamic> json) => NotificationPage(
        items: (json['items'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(AppNotification.fromJson)
            .toList(),
        unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
        nextCursor: json['nextCursor'] as String?,
      );

  final List<AppNotification> items;
  final int unreadCount;
  final String? nextCursor;
}

class NotificationsRepository {
  NotificationsRepository(this._api);

  final ApiClient _api;

  Future<NotificationPage> fetchPage({String? cursor, int limit = 20}) async {
    final data = await _api.get<Map<String, dynamic>>(
      '/api/notifications',
      query: {'limit': '$limit', 'cursor': ?cursor},
    );
    return NotificationPage.fromJson(data);
  }

  /// Qo'ng'iroq belgisidagi son uchun — bitta yozuv bilan yengil so'rov.
  Future<int> fetchUnreadCount() async => (await fetchPage(limit: 1)).unreadCount;

  /// Qaytadi: qolgan o'qilmaganlar soni.
  Future<int> markRead(List<String> ids) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/api/notifications/read',
      body: {'ids': ids},
    );
    return (data['unreadCount'] as num?)?.toInt() ?? 0;
  }

  Future<int> markAllRead() async {
    final data = await _api.post<Map<String, dynamic>>(
      '/api/notifications/read',
      body: {'all': true},
    );
    return (data['unreadCount'] as num?)?.toInt() ?? 0;
  }
}
