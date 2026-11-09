// Beslenme Takip uygulamasını parçalardan derler.
//   node tools/takip/build.js [--artifact "<yol>"]
// Çıktılar: static/duzentakip/{erkek,kadin}/index.html (site sayfaları), tools/takip/dist/Beslenme_Takip.html (artifact
// kaynağı; --artifact verilirse o yola da yazılır) ve tools/takip/dist/check.js (birleşik betik; smoke/dump/integrate için).
const fs = require('fs'), path = require('path'), vm = require('vm');
const here = __dirname, site = path.resolve(here, '..', '..');
const ORDER = ['a', 'b', 'b2', 'b3', 'b4', 'b5', 'c', 'c5', 'c2', 'c3', 'c4', 'd', 'f', 'e'];
const parts = {}; ORDER.forEach(k => { parts[k] = fs.readFileSync(path.join(here, 'app_' + k + '.html'), 'utf8'); });
const bodyParts = ORDER.filter(k => k !== 'a').map(k => parts[k]);
const scripts = Array.from(bodyParts.join('\n').matchAll(/<script>([\s\S]*?)<\/script>/g)).map(m => m[1]).join('\n');
new vm.Script(scripts, { filename: 'check.js' }); // sözdizimi hatasında burada durur
const dist = path.join(here, 'dist'); fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'check.js'), scripts, 'utf8');
// 1) artifact dosyası (iskeleti Artifact aracı ekler)
const artifact = [parts.a].concat(bodyParts).join('\n');
fs.writeFileSync(path.join(dist, 'Beslenme_Takip.html'), artifact, 'utf8');
const ai = process.argv.indexOf('--artifact'); if (ai > 0 && process.argv[ai + 1]) { fs.writeFileSync(process.argv[ai + 1], artifact, 'utf8'); }
// 2) site sayfaları: kişi kilitli, sitenin Inter yazı tipi, dış istek yok
let a = parts.a.replace(/^<title>.*\r?\n/m, '').replace(/^<meta name="claude:viewport-fit-sides"[^\n]*\r?\n/m, '').replace(/^<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^\n]*\r?\n/m, '');
a = a.replace("--font-display: 'Bricolage Grotesque', 'Segoe UI', system-ui, sans-serif;", "--font-display: 'Inter', 'Segoe UI', system-ui, sans-serif;").replace("--font-body: 'Source Sans 3', 'Segoe UI', system-ui, sans-serif;", "--font-body: 'Inter', 'Segoe UI', system-ui, sans-serif;");
if (/fonts\.googleapis|Bricolage|Source Sans/.test(a)) throw new Error('Dış yazı tipi başvurusu kaldı');
const fontface = [
  '/* Sitenin kendi Inter dosyaları (KARARLAR 2026-09-19 / 9: Google Fonts kullanılmaz) */',
  '@font-face { font-family: "Inter"; font-style: normal; font-weight: 400 600; font-display: swap; src: url("/fonts/inter-latin.woff2") format("woff2"); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }',
  '@font-face { font-family: "Inter"; font-style: normal; font-weight: 400 600; font-display: swap; src: url("/fonts/inter-turkish.woff2") format("woff2"); unicode-range: U+011E-011F, U+0130, U+015E-015F; }',
  '/* Artifact iskeletinin karşılığı */',
  ':root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }',
  'img { max-width: 100%; }',
  '[hidden] { display: none !important; }'
].join('\n');
const si = a.indexOf('<style>'); if (si < 0) throw new Error('style bloğu yok');
a = a.slice(0, si + 7) + '\n' + fontface + a.slice(si + 7);
const pages = [{ p: 'E', slug: 'erkek', label: 'Erkek' }, { p: 'K', slug: 'kadin', label: 'Kadın' }];
pages.forEach(pg => {
  const head = ['<!DOCTYPE html>', '<html lang="tr" dir="ltr">', '<head>', '<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    '<title>Beslenme Takip · ' + pg.label + '</title>', '<meta name="description" content="İki kişilik kış beslenme programı için günlük takip (' + pg.label + '). Listelenmeyen sayfa.">',
    '<meta name="robots" content="noindex, nofollow, noimageindex, noarchive">', '<meta name="theme-color" content="#F2F3EE" media="(prefers-color-scheme: light)">', '<meta name="theme-color" content="#15180F" media="(prefers-color-scheme: dark)">',
    '<meta name="mobile-web-app-capable" content="yes">', '<meta name="apple-mobile-web-app-capable" content="yes">', '<meta name="apple-mobile-web-app-title" content="Takip ' + pg.label + '">',
    '<link rel="icon" href="/img/mark.svg" type="image/svg+xml">', '<link rel="icon" href="/favicon.ico" sizes="48x48">', '<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">',
    '<link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>', '<link rel="preload" href="/fonts/inter-turkish.woff2" as="font" type="font/woff2" crossorigin>',
    "<script>window.PERSON_LOCK = '" + pg.p + "';</script>", ''].join('\n');
  const html = head + a.trimEnd() + '\n</head>\n<body>\n' + bodyParts.join('\n') + '\n</body>\n</html>\n';
  const dir = path.join(site, 'static', 'duzentakip', pg.slug); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  console.log('static ' + pg.slug + ': ' + Buffer.byteLength(html, 'utf8') + ' bayt');
});
console.log('artifact: ' + Buffer.byteLength(artifact, 'utf8') + ' bayt · check.js: ' + scripts.length + ' karakter');
