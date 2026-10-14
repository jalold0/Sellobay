import 'dart:async';

import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Bosh sahifadagi bitta banner.
class PromoSlide {
  const PromoSlide({
    required this.eyebrow,
    required this.title,
    required this.text,
    required this.cta,
    required this.onTap,
    required this.style,
  });

  final String eyebrow;
  final String title;
  final String text;
  final String cta;
  final VoidCallback onTap;
  final PromoSlideStyle style;
}

/// Banner ranglari — faqat brend palitrasidan.
enum PromoSlideStyle {
  /// Asosiy: bordo fon, oq matn.
  crimson(SellobayColors.primary, Colors.white, Color(0xFFF1D9DF), Colors.white, SellobayColors.primary),

  /// Qora fon, oltin urg'u.
  ink(SellobayColors.ink, Colors.white, SellobayColors.accent, SellobayColors.accent, SellobayColors.ink),

  /// Och fon, bordo matn.
  soft(Color(0xFFF4E9EC), SellobayColors.ink, SellobayColors.primary, SellobayColors.primary, Colors.white);

  const PromoSlideStyle(this.background, this.foreground, this.eyebrow, this.button, this.buttonText);

  final Color background;
  final Color foreground;
  final Color eyebrow;
  final Color button;
  final Color buttonText;
}

/// Bannerlar karuseli.
///
/// O'zi aylanadi, lekin foydalanuvchi surgan zahoti to'xtaydi — o'qib
/// turgan bannerni tortib ketmaslik uchun. «Animatsiyani kamaytirish»
/// yoqilgan bo'lsa umuman aylanmaydi.
class PromoCarousel extends StatefulWidget {
  const PromoCarousel({super.key, required this.slides, this.interval = const Duration(seconds: 6)});

  final List<PromoSlide> slides;
  final Duration interval;

  @override
  State<PromoCarousel> createState() => _PromoCarouselState();
}

class _PromoCarouselState extends State<PromoCarousel> {
  final _controller = PageController();
  Timer? _timer;
  int _index = 0;
  bool _userTookOver = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _schedule();
  }

  void _schedule() {
    _timer?.cancel();
    final reduceMotion = MediaQuery.of(context).disableAnimations;
    if (reduceMotion || _userTookOver || widget.slides.length < 2) return;
    _timer = Timer.periodic(widget.interval, (_) {
      if (!mounted || !_controller.hasClients) return;
      final next = (_index + 1) % widget.slides.length;
      _controller.animateToPage(next, duration: const Duration(milliseconds: 450), curve: Curves.easeOutCubic);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final textScale = MediaQuery.textScalerOf(context).scale(1).clamp(1.0, 1.6);
    return Column(
      children: [
        SizedBox(
          // Matn kattalashtirilsa banner ham o'sadi — matn kesilmasin.
          height: 226 * textScale,
          child: NotificationListener<ScrollStartNotification>(
            onNotification: (n) {
              if (n.dragDetails != null && !_userTookOver) {
                _userTookOver = true;
                _timer?.cancel();
              }
              return false;
            },
            child: PageView.builder(
              controller: _controller,
              itemCount: widget.slides.length,
              onPageChanged: (i) => setState(() => _index = i),
              itemBuilder: (context, i) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _SlideCard(slide: widget.slides[i]),
              ),
            ),
          ),
        ),
        if (widget.slides.length > 1) ...[
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < widget.slides.length; i++)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: i == _index ? 18 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: i == _index ? SellobayColors.primary : SellobayColors.border,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }
}

class _SlideCard extends StatelessWidget {
  const _SlideCard({required this.slide});

  final PromoSlide slide;

  @override
  Widget build(BuildContext context) {
    final style = slide.style;
    return Material(
      color: style.background,
      borderRadius: BorderRadius.circular(20),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: slide.onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                slide.eyebrow,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: SellobayType.caption, fontWeight: FontWeight.w600, color: style.eyebrow),
              ),
              const SizedBox(height: 6),
              Text(
                slide.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: SellobayType.heading(SellobayType.screen, color: style.foreground),
              ),
              const SizedBox(height: 6),
              Text(
                slide.text,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: SellobayType.bodySm,
                  height: 1.4,
                  color: style.foreground.withValues(alpha: 0.82),
                ),
              ),
              // Tugma doim pastda; matn qisqa bo'lsa bo'sh joy shu yerda.
              const Spacer(),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: style.button,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                  child: Text(
                    slide.cta,
                    style: TextStyle(fontSize: SellobayType.body, fontWeight: FontWeight.w700, color: style.buttonText),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
