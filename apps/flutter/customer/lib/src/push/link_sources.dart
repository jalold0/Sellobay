import 'package:app_links/app_links.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../deep_links.dart';

/// `sellobay://orders/<id>` va to'lovdan qaytish manzili.
///
/// `uriLinkStream` BOSHLANG'ICH havolani ham beradi (sovuq ishga
/// tushirish) — alohida so'ralsa ikki marta ochilardi.
class AppLinksOrderSource implements OrderLinkSource {
  AppLinksOrderSource([AppLinks? links]) : _links = links ?? AppLinks();

  final AppLinks _links;

  @override
  Stream<String> get orderIds =>
      _links.uriLinkStream.map(parseOrderLink).where((id) => id != null).cast<String>();
}

/// Bildirishnoma bosilganda ilovani ochadi: fonda bo'lsa
/// `onMessageOpenedApp`, o'chiq bo'lsa `getInitialMessage`.
class PushTapOrderSource implements OrderLinkSource {
  PushTapOrderSource([FirebaseMessaging? messaging])
    : _messaging = messaging ?? FirebaseMessaging.instance;

  final FirebaseMessaging _messaging;

  @override
  Stream<String> get orderIds async* {
    final initial = await _messaging.getInitialMessage();
    final initialId = initial == null ? null : orderIdFromPushData(initial.data);
    if (initialId != null) yield initialId;

    yield* FirebaseMessaging.onMessageOpenedApp
        .map((m) => orderIdFromPushData(m.data))
        .where((id) => id != null)
        .cast<String>();
  }
}
