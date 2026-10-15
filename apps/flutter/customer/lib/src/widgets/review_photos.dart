import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Sharh suratlari qatori. Bosilsa — to'liq ekranda, varaqlab.
class ReviewPhotoStrip extends StatelessWidget {
  const ReviewPhotoStrip({super.key, required this.urls, this.size = 72});

  final List<String> urls;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (var i = 0; i < urls.length; i++)
          Semantics(
            button: true,
            label: '${context.t('reviews.photo')} ${i + 1}',
            child: InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  fullscreenDialog: true,
                  builder: (_) => ReviewPhotoViewer(urls: urls, initial: i),
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.network(
                  urls[i],
                  width: size,
                  height: size,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(
                    width: size,
                    height: size,
                    color: SellobayColors.soft,
                    child: const Icon(Icons.broken_image_outlined, color: SellobayColors.mutedText),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// To'liq ekranli ko'rish: varaqlash va kattalashtirish.
class ReviewPhotoViewer extends StatefulWidget {
  const ReviewPhotoViewer({super.key, required this.urls, this.initial = 0});

  final List<String> urls;
  final int initial;

  @override
  State<ReviewPhotoViewer> createState() => _ReviewPhotoViewerState();
}

class _ReviewPhotoViewerState extends State<ReviewPhotoViewer> {
  late final PageController _controller = PageController(initialPage: widget.initial);
  late int _index = widget.initial;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text('${_index + 1} / ${widget.urls.length}'),
      ),
      body: PageView.builder(
        controller: _controller,
        itemCount: widget.urls.length,
        onPageChanged: (i) => setState(() => _index = i),
        itemBuilder: (_, i) => InteractiveViewer(
          maxScale: 4,
          child: Center(
            child: Image.network(
              widget.urls[i],
              fit: BoxFit.contain,
              semanticLabel: context.t('reviews.photo'),
              errorBuilder: (_, _, _) =>
                  const Icon(Icons.broken_image_outlined, color: Colors.white54, size: 48),
            ),
          ),
        ),
      ),
    );
  }
}
