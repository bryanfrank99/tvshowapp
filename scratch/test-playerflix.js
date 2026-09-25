async function test() {
  const r = await fetch('https://v1.watchplay.shop/tvshow/1399/1/1', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://playerflix.ink/'
    }
  });
  console.log('watchplay tvshow status:', r.status);
  const t = await r.text();
  console.log('watchplay tvshow length:', t.length);
  console.log('watchplay tvshow snippet:', t.slice(0, 500));
}
test();
