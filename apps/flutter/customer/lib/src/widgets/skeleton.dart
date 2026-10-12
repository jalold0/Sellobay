import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Yuklanish skeletlari.
///
/// Aylanuvchi doira «nimadir bo'lyapti» deydi, skeleton esa NIMA
/// kelishini ko'rsatadi: ekran tuzilmasi darhol paydo bo'ladi va
/// ma'lumot kelganda sakrab o'zgarmaydi.
///
/// Bitta [Skeleton] butun skeletni BITTA animatsiya bilan pulsatsiya
/// qildiradi (har quti alohida emas) — arzon va hammasi birga nafas oladi.
/// Tizimda «animatsiyani kamaytirish» yoqilgan bo'lsa pulsatsiya
/// to'xtaydi, skeletning o'zi turaveradi.
class Skeleton extends StatefulWidget {
  const Skeleton({super.key, required this.child});

  final Widget child;

  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  );

  late final Animation<double> _opacity = Tween<double>(
    begin: 1,
    end: 0.55,
  ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduce = MediaQuery.disableAnimationsOf(context);
    if (reduce) {
      _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Semantics(
    label: context.t('common.loading'),
    // Ichidagi qutilar ekran o'qiydiganlar uchun shovqin.
    child: ExcludeSemantics(
      child: IgnorePointer(
        child: FadeTransition(opacity: _opacity, child: widget.child),
      ),
    ),
  );
}

/// Bitta quti.
class SkeletonBox extends StatelessWidget {
  const SkeletonBox({super.key, this.width, this.height = 14, this.radius = 8});

  final double? width;
  final double height;
  final double radius;

  /// `SellobayColors.soft` dan bir oz to'qroq: oq fonda ko'rinadi, lekin
  /// haqiqiy kontentdan ajralib turadi.
  static const color = Color(0xFFEFE9E6);

  @override
  Widget build(BuildContext context) => Container(
    width: width,
    height: height,
    decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(radius)),
  );
}

/// Katalog kartochkasining skeleti ([ProductCard] bilan bir xil tuzilma).
class ProductCardSkeleton extends StatelessWidget {
  const ProductCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) => const Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      AspectRatio(aspectRatio: 1, child: SkeletonBox(height: double.infinity, radius: 14)),
      SizedBox(height: 10),
      SkeletonBox(width: 44, height: 10),
      SizedBox(height: 8),
      SkeletonBox(height: 14),
      SizedBox(height: 6),
      SkeletonBox(width: 90, height: 14),
      SizedBox(height: 10),
      SkeletonBox(width: 80, height: 16),
    ],
  );
}

/// Katalogdagi kabi 2 ustunli setka skeleti.
///
/// Hujayra balandligi katalog bilan bir xil hisoblanadi (rasm + matn
/// bloki, matn kattalashtirilganini hisobga olib) — shunda haqiqiy
/// ro'yxat kelganda joylashuv siljimaydi.
class ProductGridSkeleton extends StatelessWidget {
  const ProductGridSkeleton({super.key, this.count = 6, this.padding});

  final int count;
  final EdgeInsetsGeometry? padding;

  static double _cellHeight(BuildContext context) {
    const horizontalPadding = 16.0 * 2;
    const crossSpacing = 14.0;
    const textBlock = 158.0;
    final width = MediaQuery.sizeOf(context).width;
    final imageSide = (width - horizontalPadding - crossSpacing) / 2;
    final scale = MediaQuery.textScalerOf(context).scale(1).clamp(1.0, 1.8);
    return imageSide + textBlock * scale;
  }

  @override
  Widget build(BuildContext context) => Skeleton(
    child: GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: padding ?? const EdgeInsets.fromLTRB(16, 4, 16, 16),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 14,
        crossAxisSpacing: 14,
        mainAxisExtent: _cellHeight(context),
      ),
      itemCount: count,
      itemBuilder: (_, _) => const ProductCardSkeleton(),
    ),
  );
}

/// Bosh sahifa skeleti: qidiruv, kategoriyalar va ikkita gorizontal qator.
class HomeSkeleton extends StatelessWidget {
  const HomeSkeleton({super.key});

  Widget _header(double titleWidth) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 26, 16, 12),
    // `Align` SHART: ListView farzandga qat'iy kenglik beradi va
    // `width` e'tiborsiz qolib, quti butun qatorni egallardi.
    child: Align(
      alignment: Alignment.centerLeft,
      child: SkeletonBox(width: titleWidth, height: 20),
    ),
  );

  Widget _row() => SizedBox(
    height: 300,
    child: ListView.separated(
      scrollDirection: Axis.horizontal,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: 3,
      separatorBuilder: (_, _) => const SizedBox(width: 12),
      itemBuilder: (_, _) => const SizedBox(width: 168, child: ProductCardSkeleton()),
    ),
  );

  @override
  Widget build(BuildContext context) => Skeleton(
    child: ListView(
      physics: const NeverScrollableScrollPhysics(),
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: SkeletonBox(height: 48, radius: 14),
        ),
        _header(140),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              SkeletonBox(width: 72, height: 38, radius: 10),
              SizedBox(width: 8),
              SkeletonBox(width: 96, height: 38, radius: 10),
              SizedBox(width: 8),
              SkeletonBox(width: 80, height: 38, radius: 10),
            ],
          ),
        ),
        _header(190),
        _row(),
      ],
    ),
  );
}

/// Buyurtmalar ro'yxati skeleti.
class OrderListSkeleton extends StatelessWidget {
  const OrderListSkeleton({super.key, this.count = 3});

  final int count;

  @override
  Widget build(BuildContext context) => Skeleton(
    child: ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      itemCount: count,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, _) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          border: Border.all(color: SellobayColors.border),
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                SkeletonBox(width: 150, height: 14),
                Spacer(),
                SkeletonBox(width: 72, height: 22, radius: 8),
              ],
            ),
            SizedBox(height: 8),
            SkeletonBox(width: 90, height: 11),
            SizedBox(height: 14),
            SkeletonBox(width: 48, height: 48, radius: 10),
            SizedBox(height: 14),
            Row(
              children: [
                SkeletonBox(width: 80, height: 12),
                Spacer(),
                SkeletonBox(width: 100, height: 16),
              ],
            ),
          ],
        ),
      ),
    ),
  );
}

/// Sharhlar ro'yxati skeleti.
class ReviewListSkeleton extends StatelessWidget {
  const ReviewListSkeleton({super.key, this.count = 3});

  final int count;

  @override
  Widget build(BuildContext context) => Skeleton(
    child: ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      itemCount: count,
      separatorBuilder: (_, _) => const Divider(height: 28),
      itemBuilder: (_, _) => const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SkeletonBox(width: 160, height: 14),
          SizedBox(height: 10),
          SkeletonBox(width: 96, height: 12),
          SizedBox(height: 10),
          SkeletonBox(height: 12),
          SizedBox(height: 6),
          SkeletonBox(width: 220, height: 12),
        ],
      ),
    ),
  );
}

/// Mahsulot sahifasi skeleti: katta rasm, nom, narx va variant tugmalari.
class ProductDetailSkeleton extends StatelessWidget {
  const ProductDetailSkeleton({super.key});

  @override
  Widget build(BuildContext context) => Skeleton(
    child: ListView(
      physics: const NeverScrollableScrollPhysics(),
      children: const [
        AspectRatio(aspectRatio: 1, child: SkeletonBox(height: double.infinity, radius: 0)),
        Padding(
          padding: EdgeInsets.fromLTRB(16, 18, 16, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SkeletonBox(width: 60, height: 11),
              SizedBox(height: 10),
              SkeletonBox(width: 230, height: 22),
              SizedBox(height: 16),
              SkeletonBox(width: 170, height: 26),
              SizedBox(height: 22),
              SkeletonBox(width: 70, height: 14),
              SizedBox(height: 10),
              Row(
                children: [
                  SkeletonBox(width: 64, height: 40, radius: 10),
                  SizedBox(width: 8),
                  SkeletonBox(width: 64, height: 40, radius: 10),
                  SizedBox(width: 8),
                  SkeletonBox(width: 64, height: 40, radius: 10),
                ],
              ),
            ],
          ),
        ),
      ],
    ),
  );
}
