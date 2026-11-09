// Birleştirilmiş hafta planını app_b5.html içindeki WEEK_PLANS deposuna yazar; iki haftadan eski planları siler.
//   node tools/takip/apply_week.js <tools/takip dizini> <merged.json> [--keep-from YYYY-MM-DD]
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const kf = args.indexOf('--keep-from');
const keepFrom = kf >= 0 ? args[kf + 1] : null;
const positional = kf >= 0 ? args.filter((a, i) => i !== kf && i !== kf + 1) : args;
const [dir, mergedFile] = positional;
if (!dir || !mergedFile) { console.error('kullanım: node apply_week.js <tools/takip dizini> <merged.json> [--keep-from YYYY-MM-DD]'); process.exit(1); }
const merged = JSON.parse(fs.readFileSync(mergedFile, 'utf8'));
if (!merged || !merged.ws || !merged.days) { console.error('geçersiz plan'); process.exit(1); }
const file = path.join(dir, 'app_b5.html');
const src = fs.readFileSync(file, 'utf8');
const m = src.match(/const WEEK_PLANS = ([\s\S]*?);\nObject\.keys\(WEEK_PLANS\)/);
if (!m) { console.error('WEEK_PLANS bloğu bulunamadı'); process.exit(1); }
let plans; try { plans = JSON.parse(m[1]); } catch (e) { console.error('WEEK_PLANS okunamadı: ' + e.message); process.exit(1); }
plans[merged.ws] = { days: merged.days, recipes: merged.recipes || [], meta: merged.meta || {} };
const addDays = (s, n) => { const a = s.split('-').map(Number); const d = new Date(a[0], a[1] - 1, a[2] + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const cutoff = keepFrom || addDays(merged.ws, -14);
const removed = Object.keys(plans).filter(w => w < cutoff); removed.forEach(w => { delete plans[w]; });
const keys = Object.keys(plans).sort();
const literal = keys.length ? '{\n' + keys.map(w => '  ' + JSON.stringify(w) + ': ' + JSON.stringify(plans[w])).join(',\n') + '\n}' : '{}';
fs.writeFileSync(file, src.replace(m[0], 'const WEEK_PLANS = ' + literal + ';\nObject.keys(WEEK_PLANS)'), 'utf8');
console.log('WEEK_PLANS: ' + keys.join(', ') + (removed.length ? ' · silinen: ' + removed.join(', ') : '') + ' · ' + merged.ws + ' yazıldı (' + (merged.recipes || []).length + ' yeni tarif)');
