/**
 * Android MainActivity Template for Mavrixfy
 * 
 * Location: android/app/src/main/java/com/mavrixfy/app/MainActivity.java
 * 
 * This file configures the Android WebView to support Google OAuth popups
 */

package com.mavrixfy.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    // Enable WebView debugging in debug builds
    if (BuildConfig.DEBUG) {
      WebView.setWebContentsDebuggingEnabled(true);
    }
    
    // Configure WebView settings for OAuth authentication
    configureWebViewForAuth();
  }
  
  private void configureWebViewForAuth() {
    WebView webView = this.bridge.getWebView();
    WebSettings settings = webView.getSettings();
    
    // Enable JavaScript (required for Firebase Auth)
    settings.setJavaScriptEnabled(true);
    
    // Enable DOM storage (required for Firebase)
    settings.setDomStorageEnabled(true);
    
    // Allow JavaScript to open windows automatically (required for popups)
    settings.setJavaScriptCanOpenWindowsAutomatically(true);
    
    // Support multiple windows (required for OAuth popups)
    settings.setSupportMultipleWindows(true);
    
    // Enable database storage
    settings.setDatabaseEnabled(true);
    
    // Allow file access
    settings.setAllowFileAccess(true);
    
    // Enable mixed content (if needed)
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
      settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }
    
    // Allow third-party cookies (required for Google OAuth)
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
      android.webkit.CookieManager cookieManager = android.webkit.CookieManager.getInstance();
      cookieManager.setAcceptCookie(true);
      cookieManager.setAcceptThirdPartyCookies(webView, true);
    }
    
    // Set user agent to ensure compatibility
    String userAgent = settings.getUserAgentString();
    settings.setUserAgentString(userAgent + " MavrixfyApp/1.0");
    
    // Enable caching for better performance
    settings.setCacheMode(WebSettings.LOAD_DEFAULT);
    settings.setAppCacheEnabled(true);
    
    // Enable zoom controls (optional)
    settings.setSupportZoom(false);
    settings.setBuiltInZoomControls(false);
    settings.setDisplayZoomControls(false);
    
    System.out.println("✅ WebView configured for OAuth authentication");
  }
  
  @Override
  public void onResume() {
    super.onResume();
    // Clear any stale auth state when app resumes
    clearAuthCache();
  }
  
  private void clearAuthCache() {
    WebView webView = this.bridge.getWebView();
    if (webView != null) {
      // Clear cache but keep login state
      webView.clearCache(false);
      
      // Clear form data
      webView.clearFormData();
      
      // Clear history (optional)
      // webView.clearHistory();
      
      System.out.println("✅ WebView cache cleared");
    }
  }
}
