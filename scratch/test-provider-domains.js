const fs = require('fs');

async function check(url, ref) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': ref } });
    const text = await res.text();
    const matches = Array.from(text.matchAll(/<iframe[^>]+src=["']?([^"'>]+)/gi)).map(m => m[1]);
    console.log(url, '-> status:', res.status, 'iframes:', matches);
  } catch(e) {
    console.log(url, 'Error:', e.message);
  }
}

async function run() {
  await check('https://myembed.biz/filme/550', 'https://tvshowapp.net/');
  await check('https://redeflixapi.store/filme/550', 'https://tvshowapp.net/');
  await check('https://streambetter.shop/filme/550', 'https://tvshowapp.net/');
  await check('https://embed.filmu.in/movie/550', 'https://tvshowapp.net/');
  await check('https://nsrplay.space/embed/movie/550', 'https://tvshowapp.net/');
}

run();
