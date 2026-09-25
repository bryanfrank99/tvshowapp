import type { CapacitorConfig } from '@capacitor/cli';

// Shell nativo sobre producción (cero refactor web).
// El bloqueo de ads/popups vive en android/ (AdBlockWebViewClient).
const config: CapacitorConfig = {
  appId: 'com.tvshow.app',
  appName: 'TVShow',
  webDir: 'public',
  server: {
    url: 'https://tvshowapp.net',
    cleartext: false,
    allowNavigation: ['tvshowapp.net', 'tvshowapp-one.vercel.app', 'myembed.biz', 'redeflixapi.store', 'pipocacine.lat', 'vidcore.io', 'vidzy.org', 'vimeus.com', 'multiembed.mov', 'moviesapi.to', 'cinesrc.st', 'player.vidzee.wtf', 'embos.top', 'vidapi.xyz', 'streambetter.shop', 'megaembed.com', 'mgeb.top', 'playerflix.ink', 'watchplay.shop', 'superflixapi.quest'],
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
