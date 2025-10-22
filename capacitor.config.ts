import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.isometrics.app',
  appName: 'Isometrics App',
  webDir: 'dist/isometrics-app/browser',

  // Server configuration for live reload during development
  server: {
    // Uncomment for development with live reload:
    // url: 'http://192.168.x.x:4200',
    // cleartext: true
  },

  // Android-specific configuration
  android: {
    allowMixedContent: true,
    backgroundColor: '#ffffff',
    // Enable hardware acceleration for better canvas performance
    webContentsDebuggingEnabled: true
  },

  // iOS-specific configuration
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
    // Enable WKWebView for better performance
    scrollEnabled: true,
    allowsLinkPreview: false
  },

  // Plugins configuration
  plugins: {
    // SplashScreen: {
    //   launchShowDuration: 2000,
    //   backgroundColor: '#ffffff',
    //   showSpinner: false
    // }
  }
};

export default config;
