/// Foydalanuvchi rollari (`UserRole` enum, packages/database/prisma/schema.prisma).
///
/// Satr sifatida keladi, chunki JWT ichida ham satr: `{ sub, roles, sid }`.
abstract final class UserRoles {
  static const customer = 'CUSTOMER';
  static const seller = 'SELLER';
  static const courier = 'COURIER';
  static const admin = 'ADMIN';
  static const superAdmin = 'SUPER_ADMIN';
}

/// Tizimga kirgan foydalanuvchi.
///
/// DIQQAT: `roles` faqat `GET /api/auth/me` dan to'ladi. `login`,
/// `register` va `otp/verify` javoblarida rol YO'Q — ular qisqartirilgan
/// user qaytaradi. Shu sababli kirish oqimi doim `me()` bilan tugaydi
/// (qarang: `AuthController._establish`). Rolga qarab qaror qabul
/// qilishdan oldin shuni yodda tuting.
class AuthUser {
  const AuthUser({
    required this.id,
    this.email,
    this.phone,
    this.firstName,
    this.lastName,
    this.avatarUrl,
    this.locale,
    this.gender,
    this.birthDate,
    this.status,
    this.loyaltyPoints = 0,
    this.roles = const <String>[],
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        email: json['email'] as String?,
        phone: json['phone'] as String?,
        firstName: json['firstName'] as String?,
        lastName: json['lastName'] as String?,
        avatarUrl: json['avatarUrl'] as String?,
        locale: json['locale'] as String?,
        gender: json['gender'] as String?,
        // Server `Date` ni ISO satr sifatida beradi; faqat sana qismi
        // kerak, shuning uchun kesib olamiz.
        birthDate: (json['birthDate'] as String?)?.split('T').first,
        status: json['status'] as String?,
        loyaltyPoints: (json['loyaltyPoints'] as num?)?.toInt() ?? 0,
        roles: (json['roles'] as List<dynamic>?)?.cast<String>() ?? const <String>[],
      );

  final String id;
  final String? email;
  final String? phone;
  final String? firstName;
  final String? lastName;
  final String? avatarUrl;
  final String? locale;

  /// `MALE` / `FEMALE` / `UNSPECIFIED`.
  ///
  /// XOM satr: server yangi qiymat qo'shsa eski ilova yiqilmasin.
  /// Server bu maydonni ancha oldin qaytarardi va `PATCH` da qabul
  /// ham qilardi — model uni o'qimasdi.
  final String? gender;

  /// `YYYY-MM-DD`. Vaqt qismi yo'q — bu SANA, moment emas.
  final String? birthDate;

  final String? status;
  final int loyaltyPoints;
  final List<String> roles;

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'email': email,
        'phone': phone,
        'firstName': firstName,
        'lastName': lastName,
        'avatarUrl': avatarUrl,
        'locale': locale,
        'status': status,
        'loyaltyPoints': loyaltyPoints,
        'roles': roles,
      };

  bool hasRole(String role) => roles.contains(role);

  /// Ko'rsatish uchun nom. Ism ham, familiya ham bo'lmasligi mumkin:
  /// OTP bilan kirgan foydalanuvchi faqat telefon bilan yaraladi.
  String get displayName {
    final full = [firstName, lastName].whereType<String>().where((s) => s.isNotEmpty).join(' ');
    if (full.isNotEmpty) return full;
    return phone ?? email ?? '';
  }

  AuthUser copyWith({List<String>? roles}) => AuthUser(
        id: id,
        email: email,
        phone: phone,
        firstName: firstName,
        lastName: lastName,
        avatarUrl: avatarUrl,
        locale: locale,
        status: status,
        loyaltyPoints: loyaltyPoints,
        roles: roles ?? this.roles,
      );
}
