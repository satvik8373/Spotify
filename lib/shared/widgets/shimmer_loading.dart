import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../../core/theme/app_colors.dart';

class ShimmerBox extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;
  
  const ShimmerBox({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = 4,
  });

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppColors.shimmerBase,
      highlightColor: AppColors.shimmerHighlight,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: AppColors.shimmerBase,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
    );
  }
}

class ShimmerQuickPicks extends StatelessWidget {
  const ShimmerQuickPicks({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 3.5,
          crossAxisSpacing: 8,
          mainAxisSpacing: 8,
        ),
        itemCount: 6,
        itemBuilder: (context, index) {
          return Shimmer.fromColors(
            baseColor: AppColors.shimmerBase,
            highlightColor: AppColors.shimmerHighlight,
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.shimmerBase,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          );
        },
      ),
    );
  }
}

class ShimmerHorizontalList extends StatelessWidget {
  final String title;
  
  const ShimmerHorizontalList({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        SizedBox(
          height: 200,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: 5,
            itemBuilder: (context, index) {
              return Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const ShimmerBox(width: 150, height: 150, borderRadius: 8),
                    const SizedBox(height: 8),
                    const ShimmerBox(width: 120, height: 14),
                    const SizedBox(height: 4),
                    const ShimmerBox(width: 80, height: 12),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class ShimmerSongTile extends StatelessWidget {
  const ShimmerSongTile({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          const ShimmerBox(width: 48, height: 48),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                ShimmerBox(width: 150, height: 14),
                SizedBox(height: 4),
                ShimmerBox(width: 100, height: 12),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
