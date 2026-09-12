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
    allowNavigation: ['myembed.biz', 'redeflixapi.store', 'pipocacine.lat', 'vidcore.io', 'vidzy.org', 'vimeus.com', 'multiembed.mov', 'moviesapi.to', 'cinesrc.st', 'player.vidzee.wtf', 'embos.top', 'vidapi.xyz', 'streambetter.shop', 'megaembed.com', 'mgeb.top'],
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
