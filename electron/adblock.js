const fs = require('fs');
const path = require('path');

const BLOCKED_HOSTS = new Set();
let isInitialized = false;

function initAdBlock(customFilePath) {
  if (isInitialized) return;
  const filePath = customFilePath || path.join(__dirname, 'adhosts.txt');
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (let line of lines) {
        line = line.trim().toLowerCase();
        if (!line || line.startsWith('#')) continue;
        const parts = line.split(/\s+/);
        const host = parts[parts.length - 1];
        if (host && host.includes('.')) {
          BLOCKED_HOSTS.add(host);
        }
      }
    }
  } catch (err) {
    console.error('[AdBlock] Error loading adhosts.txt:', err);
  }
  isInitialized = true;
}

function isBlocked(urlString) {
  if (!urlString) return false;
  if (!isInitialized) initAdBlock();

  let hostname = '';
  try {
    const parsed = new URL(urlString);
    hostname = (parsed.hostname || '').toLowerCase();
  } catch {
    return false;
  }

  if (!hostname) return false;
  if (BLOCKED_HOSTS.has(hostname)) return true;

  // Comprobar dominios padre (x.evil.com -> evil.com)
  let dotIndex = hostname.indexOf('.');
  while (dotIndex !== -1) {
    const parent = hostname.substring(dotIndex + 1);
    if (BLOCKED_HOSTS.has(parent)) return true;
    dotIndex = hostname.indexOf('.', dotIndex + 1);
  }

  return false;
}

const ALLOWED_STREAM_HOSTS = [
  'tvshowapp.net',
  'tvshowapp-one.vercel.app',
  'localhost',
  '127.0.0.1',
  'myembed.biz',
  'redeflixapi.store',
  'pipocacine.lat',
  'vidcore.io',
  'vidzy.org',
  'vimeus.com',
  'multiembed.mov',
  'moviesapi.to',
  'cinesrc.st',
  'player.vidzee.wtf',
  'embos.top',
  'vidapi.xyz',
  'streambetter.shop',
  'megaembed.com',
  'mgeb.top',
  'playerflix.ink',
  'superembed.stream',
  'image.tmdb.org',
  'via.placeholder.com',
  'metahub.space',
  'static.tvmaze.com',
  'm.media-amazon.com',
  'githubusercontent.com'
];

function isAllowedHost(host) {
  if (!host) return false;
  const h = host.toLowerCase();
  if (h.endsWith('.vercel.app')) return true;
  for (const allowed of ALLOWED_STREAM_HOSTS) {
    if (h === allowed || h.endsWith('.' + allowed)) return true;
  }
  return false;
}

const EXTERNAL_SAFE_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'imdb.com',
  'themoviedb.org',
  'tmdb.org'
];

function isSafeExternalUrl(urlString) {
  if (!urlString) return false;
  try {
    const parsed = new URL(urlString);
    const host = (parsed.hostname || '').toLowerCase();
    for (const safe of EXTERNAL_SAFE_DOMAINS) {
      if (host === safe || host.endsWith('.' + safe)) return true;
    }
  } catch {
    return false;
  }
  return false;
}

module.exports = {
  initAdBlock,
  isBlocked,
  isAllowedHost,
  isSafeExternalUrl
};
