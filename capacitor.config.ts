import type { CapacitorConfig } from '@capacitor/cli';

// Shell nativo sobre producción (cero refactor web).
// El bloqueo de ads/popups vive en android/ (AdBlockWebViewClient).
const config: CapacitorConfig = {
  appId: 'com.tvshow.app',
  appName: 'TVShow',
  webDir: 'public',
  server: {
    url: 'https://tvshowapp-one.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
