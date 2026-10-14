import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

Map<String, dynamic> _cat(String slug, int count, [List<Map<String, dynamic>> children = const []]) => {
      'id': slug,
      'slug': slug,
      'name': {'uz': slug},
      'iconUrl': null,
      'productCount': count,
      'children': children,
    };

void main() {
  final roots = [
    CategorySummary.fromJson(_cat('ayollar', 3, [
      _cat('ayollar-kiyim', 3),
      _cat('ayollar-sumkalar', 0),
    ])),
    CategorySummary.fromJson(_cat('aksessuarlar', 1)),
  ];

  test('ichki turlar o`qiladi; eski javobda children yo`q — bo`sh ro`yxat', () {
    expect(roots.first.children.map((c) => c.slug), ['ayollar-kiyim', 'ayollar-sumkalar']);
    final old = CategorySummary.fromJson({
      'id': 'x',
      'slug': 'x',
      'name': {'uz': 'x'},
      'productCount': 1,
    });
    expect(old.children, isEmpty);
  });

  test('withoutEmpty bo`sh ichki turni olib tashlaydi', () {
    expect(roots.first.withoutEmpty().children.map((c) => c.slug), ['ayollar-kiyim']);
  });

  test('findCategory ichki tur uchun bo`limini ham beradi', () {
    final hit = findCategory(roots, 'ayollar-kiyim');
    expect(hit?.node.slug, 'ayollar-kiyim');
    expect(hit?.department.slug, 'ayollar');
    expect(findCategory(roots, 'aksessuarlar')?.department.slug, 'aksessuarlar');
    expect(findCategory(roots, 'yoq'), isNull);
  });
}
