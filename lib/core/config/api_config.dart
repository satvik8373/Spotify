class ApiConfig {
  // Base URL - Your Vercel backend
  static const String baseUrl = 'https://spotify-api-drab.vercel.app/api';
  
  // API Endpoints
  static const String auth = '/auth';
  static const String login = '$auth/login';
  static const String register = '$auth/register';
  static const String logout = '$auth/logout';
  static const String refreshToken = '$auth/refresh';
  
  static const String users = '/users';
  static const String profile = '$users/profile';
  
  static const String songs = '/songs';
  static const String search = '$songs/search';
  static const String trending = '$songs/trending';
  static const String newReleases = '$songs/new-releases';
  
  static const String albums = '/albums';
  static const String playlists = '/playlists';
  static const String likedSongs = '/liked-songs';
  
  static const String deezer = '/deezer';
  static const String jiosaavn = '/jiosaavn';
  static const String spotify = '/spotify';
  
  // Cloudinary
  static const String cloudinaryUpload = '/cloudinary/upload';
  
  // Socket
  static const String socketUrl = 'https://spotify-api-drab.vercel.app';
}
