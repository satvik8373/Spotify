import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';

final firebaseAuthProvider = Provider<FirebaseAuth>((ref) {
  return FirebaseAuth.instance;
});

final authStateProvider = StreamProvider<User?>((ref) {
  return ref.watch(firebaseAuthProvider).authStateChanges();
});

final authControllerProvider = StateNotifierProvider<AuthController, AsyncValue<User?>>((ref) {
  return AuthController(ref);
});

class AuthController extends StateNotifier<AsyncValue<User?>> {
  final Ref _ref;
  
  AuthController(this._ref) : super(const AsyncValue.loading()) {
    _init();
  }
  
  void _init() {
    _ref.listen(authStateProvider, (previous, next) {
      state = next;
    });
  }
  
  FirebaseAuth get _auth => _ref.read(firebaseAuthProvider);
  
  // Email & Password Sign In
  Future<void> signInWithEmail(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
    } on FirebaseAuthException catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
  
  // Email & Password Sign Up
  Future<void> signUpWithEmail(String email, String password, String displayName) async {
    state = const AsyncValue.loading();
    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      await credential.user?.updateDisplayName(displayName);
    } on FirebaseAuthException catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
  
  // Google Sign In
  Future<void> signInWithGoogle() async {
    state = const AsyncValue.loading();
    try {
      final GoogleSignInAccount? googleUser = await GoogleSignIn().signIn();
      if (googleUser == null) {
        state = const AsyncValue.data(null);
        return;
      }
      
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );
      
      await _auth.signInWithCredential(credential);
    } on FirebaseAuthException catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
  
  // Sign Out
  Future<void> signOut() async {
    await GoogleSignIn().signOut();
    await _auth.signOut();
  }
  
  // Password Reset
  Future<void> sendPasswordResetEmail(String email) async {
    await _auth.sendPasswordResetEmail(email: email);
  }
}
