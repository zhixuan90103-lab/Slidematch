import type { CapacitorConfig } from '@capacitor/cli';

/**
 * iOS portrait game shell:
 * - contentInset never → Safe Area only via CSS env() / --safe-*
 * - base './' on Vite → relative assets for offline WebView
 */
const config: CapacitorConfig = {
  appId: 'com.slidematch.play',
  appName: 'SlideMatch',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'never',
    preferredContentMode: 'mobile',
    backgroundColor: '#fdf1e7',
    scrollEnabled: false,
  },
};

export default config;
