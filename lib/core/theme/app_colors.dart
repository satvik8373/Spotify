import 'package:flutter/material.dart';

class AppColors {
  // Dark Theme Colors (Spotify-like) - matching web app CSS variables
  // --background: 20 14.3% 4.1% = hsl(20, 14.3%, 4.1%) ≈ #0d0b09
  // --primary: 142.1 70.6% 45.3% = hsl(142.1, 70.6%, 45.3%) ≈ #1DB954
  static const Color primary = Color(0xFF1DB954);  // Spotify Green
  static const Color secondary = Color(0xFF1ED760);
  static const Color background = Color(0xFF121212);  // Spotify dark background
  static const Color surface = Color(0xFF181818);  // Card background
  static const Color surfaceLight = Color(0xFF282828);  // Elevated surface
  static const Color surfaceLighter = Color(0xFF333333);
  
  // Text colors matching web app
  // --foreground: 0 0% 95% = white with 95% lightness
  // --muted-foreground: 240 5% 64.9%
  static const Color textPrimary = Color(0xFFF2F2F2);  // 95% white
  static const Color textSecondary = Color(0xFFB3B3B3);  // Muted text
  static const Color textTertiary = Color(0xFF727272);  // Even more muted
  
  static const Color error = Color(0xFFE91429);
  static const Color success = Color(0xFF1DB954);
  static const Color warning = Color(0xFFF59B23);
  
  // Liked Songs gradient colors (from web app CSS)
  // .spotify-liked-gradient: rgb(32, 65, 207) -> rgb(13, 23, 125) -> rgb(6, 16, 42) -> black
  static const Color likedSongsGradientTop = Color(0xFF5038A0);  // Purple/indigo
  static const Color likedSongsGradientMid = Color(0xFF1E1040);  // Dark purple
  static const Color likedSongsGradientBottom = Color(0xFF121212);  // Background
  
  // Playlist gradient colors
  static const Color playlistGradientTop = Color(0xFF2041CF);  // Blue
  static const Color playlistGradientMid = Color(0xFF0D177D);  // Dark blue
  
  // Light Theme Colors
  static const Color lightBackground = Color(0xFFF5F5F5);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceLight = Color(0xFFF0F0F0);
  
  static const Color lightTextPrimary = Color(0xFF121212);
  static const Color lightTextSecondary = Color(0xFF535353);
  static const Color lightTextTertiary = Color(0xFF878787);
  
  // Gradient Colors
  static const List<Color> primaryGradient = [
    Color(0xFF1DB954),
    Color(0xFF1ED760),
  ];
  
  static const List<Color> darkGradient = [
    Color(0xFF121212),
    Color(0xFF181818),
  ];
  
  // Liked Songs gradient (matching web app)
  static const List<Color> likedSongsGradient = [
    Color(0xFF5038A0),  // Purple top
    Color(0xFF1E1040),  // Dark purple mid
    Color(0xFF121212),  // Background bottom
  ];
  
  // Player Colors
  static const Color playerBackground = Color(0xFF181818);
  static const Color miniPlayerBackground = Color(0xFF282828);
  
  // Skeleton/Shimmer Colors
  static const Color shimmerBase = Color(0xFF282828);
  static const Color shimmerHighlight = Color(0xFF3E3E3E);
  
  // Border color (matching web app --border)
  static const Color border = Color(0xFF282828);
  
  // Card colors (matching web app --card)
  static const Color card = Color(0xFF1A1714);  // hsl(24, 9.8%, 10%)
  static const Color cardForeground = Color(0xFFF2F2F2);
}
