/// FAQAT TESTLAR UCHUN: soxta backend va xotiradagi sessiya saqlovi.
///
/// Asosiy kutubxonadan (`sellobay_shared.dart`) ATAYLAB ajratilgan —
/// ilova kodi uni tasodifan import qilib qo'ymasin. Naqsh
/// `package:http/testing.dart` dan olingan.
///
/// Ikkala ilova testlari ham shu yerdan foydalanadi: soxta backendni
/// har bir ilovada qaytadan yozish ularning bir-biridan ajralib
/// ketishiga olib kelardi.
library;

export 'src/testing/fake_backend.dart';

/// Soxta javob turi — `FakeBackend` ishlovchisi shuni qaytaradi.
/// Testlar `dio` ni alohida import qilmasin.
export 'package:dio/dio.dart' show ResponseBody;
