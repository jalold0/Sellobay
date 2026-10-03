import 'package:decimal/decimal.dart';

import '../catalog/localized_text.dart';
import '../catalog/product.dart';
import '../utils/money.dart';

/// Savatdagi bitta satr.
///
/// Nom, brend va rasm SHU YERDA saqlanadi, chunki server savatni faqat
/// id va son sifatida biladi (`/api/cart` javobida `productId`,
/// `variantId`, `quantity`, `unitPrice` bor, xolos). Bularni saqlamasak,
/// savatni ochish uchun har safar katalogga so'rov kerak bo'lardi va
/// internetsiz savat bo'm-bo'sh ko'rinardi.
class CartLine {
  const CartLine({
    required this.productId,
    required this.variantId,
    required this.slug,
    required this.name,
    required this.brandName,
    required this.rawImageUrl,
    required this.unitPrice,
    required this.oldPrice,
    required this.currency,
    required this.quantity,
    this.color,
    this.size,
  });

  factory CartLine.fromProduct(
    ProductSummary product, {
    String? variantId,
    Decimal? unitPrice,
    int quantity = 1,
    String? color,
    String? size,
  }) =>
      CartLine(
        productId: product.id,
        variantId: variantId,
        slug: product.slug,
        name: product.name,
        brandName: product.brandName,
        rawImageUrl: product.rawImageUrl,
        // Narx QO'SHILGAN paytdagi qiymat. Server ham shunday ishlaydi
        // (`CartItem.unitPrice` — snapshot).
        unitPrice: unitPrice ?? product.price,
        oldPrice: product.oldPrice,
        currency: product.currency,
        quantity: quantity,
        color: color,
        size: size,
      );

  /// Mahsulot sahifasidan qo'shish.
  ///
  /// [variantId] variantli mahsulotda SHART: buyurtma aynan variantga
  /// tushadi, aks holda har doim standart variantning zaxirasi kamayadi.
  factory CartLine.fromDetail(
    ProductDetail product, {
    required String? variantId,
    Decimal? unitPrice,
    int quantity = 1,
    String? color,
    String? size,
  }) =>
      CartLine(
        productId: product.id,
        variantId: variantId,
        slug: product.slug,
        name: product.name,
        brandName: product.brandName,
        // Birinchi rasm — katalogdagi bilan bir xil manba.
        rawImageUrl: product.images.isEmpty ? null : product.images.first.url,
        unitPrice: unitPrice ?? product.price,
        oldPrice: product.oldPrice,
        currency: product.currency,
        quantity: quantity,
        color: color,
        size: size,
      );

  factory CartLine.fromJson(Map<String, dynamic> json) => CartLine(
        productId: json['productId'] as String,
        variantId: json['variantId'] as String?,
        slug: json['slug'] as String? ?? '',
        name: LocalizedText.fromJson(json['name']),
        brandName: json['brandName'] as String?,
        rawImageUrl: json['rawImageUrl'] as String?,
        unitPrice: parseMoney(json['unitPrice']),
        oldPrice: json['oldPrice'] == null ? null : parseMoney(json['oldPrice']),
        currency: json['currency'] as String? ?? 'UZS',
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
        color: json['color'] as String?,
        size: json['size'] as String?,
      );

  final String productId;

  /// Variant tanlangan bo'lsa — uning id'si. Buyurtmada SHART.
  final String? variantId;

  final String slug;
  final LocalizedText name;
  final String? brandName;
  final String? rawImageUrl;
  final Decimal unitPrice;
  final Decimal? oldPrice;
  final String currency;
  final int quantity;
  final String? color;
  final String? size;

  /// Satrni aniqlovchi kalit.
  ///
  /// Server savatni AYNAN shu juftlik bo'yicha biladi
  /// (`productId|variantId`), shuning uchun mahalliy kalit ham undan
  /// kengroq bo'lmasligi kerak: aks holda sinxrondan keyin bitta server
  /// satri ikkita mahalliy satrga tushib, sonlar ikki barobar bo'lardi.
  String get key => '$productId|${variantId ?? ''}';

  Decimal get lineTotal => unitPrice * Decimal.fromInt(quantity);

  CartLine copyWith({int? quantity}) => CartLine(
        productId: productId,
        variantId: variantId,
        slug: slug,
        name: name,
        brandName: brandName,
        rawImageUrl: rawImageUrl,
        unitPrice: unitPrice,
        oldPrice: oldPrice,
        currency: currency,
        quantity: quantity ?? this.quantity,
        color: color,
        size: size,
      );

  Map<String, dynamic> toJson() => <String, dynamic>{
        'productId': productId,
        'variantId': variantId,
        'slug': slug,
        'name': name.toJsonMap(),
        'brandName': brandName,
        'rawImageUrl': rawImageUrl,
        'unitPrice': unitPrice.toString(),
        'oldPrice': oldPrice?.toString(),
        'currency': currency,
        'quantity': quantity,
        'color': color,
        'size': size,
      };
}
