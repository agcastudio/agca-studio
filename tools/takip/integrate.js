// Ajanın plan çıktısını haftaya işler, doğrular, tarif malzemelerinden eksik alışveriş kalemlerini ekler.
//   node tools/takip/integrate.js <dist/check.js> <plan.json> <ws> <outdir> [--full]
// --full: ajan 7 günün tamamını verir (Pazar rutini). Verilmezse yalnız gönderilen günler değişir, kalanlar mevcut plandan.
// Çıktı: <outdir>/merged_<ws>.json ve stdout'ta JSON özet (problems boş olmalı, auditLeft boş olmalı).
const fs = require('fs'), vm = require('vm'), path = require('path');
const args = process.argv.slice(2), full = args.indexOf('--full') >= 0;
const [codeFile, planFile, ws, outdir] = args.filter(a => a !== '--full');
const code = fs.readFileSync(codeFile, 'utf8');
const store = new Map();
const el = () => ({ hidden: false, set innerHTML(v) {}, classList: { toggle() {} }, addEventListener() {}, textContent: '', value: '', dataset: {}, closest() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; } });
const sandbox = { console, document: { querySelector: el, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, activeElement: null, visibilityState: 'visible' }, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0, Date, Math, JSON, Number, String, Array, Object, Set, Map, Promise, RegExp, Error, isFinite, parseInt, parseFloat, TextEncoder, crypto: globalThis.crypto, fetch: async () => { throw new Error('offline'); }, localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }, navigator: { userAgent: 'node' }, location: { hash: '' }, PERSON_LOCK: 'E', addEventListener() {}, removeEventListener() {}, scrollTo() {} };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const rev = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const problems = [];
// 1) yeni tarifler: normalize et, denetim için kayıt listesine ekle
sandbox.__rev = rev;
const newRecipes = vm.runInContext('(__rev.recipes || []).map(normRecipeDef).filter(Boolean)', sandbox);
sandbox.__new = newRecipes;
const added = vm.runInContext('__new.map(r => { if (RECIPES.find(x => x.id === r.id)) return "mevcut:" + r.id; RECIPES.push(r); return "yeni:" + r.id; })', sandbox);
const freshRecipes = newRecipes.filter((r, i) => added[i].startsWith('yeni:'));
// 2) günleri birleştir
const base = vm.runInContext('codeWeekDoc(' + JSON.stringify(ws) + ')', sandbox) || { days: {} };
const DAY_NAMES = vm.runInContext('DAY_NAMES', sandbox);
const known = new Set(vm.runInContext('RECIPES.map(r => r.id)', sandbox));
const wanted = full ? ['1', '2', '3', '4', '5', '6', '0'] : Object.keys(rev.days || {});
const changes = [];
wanted.forEach(d => {
  const day = rev.days && rev.days[d];
  if (!day || !Array.isArray(day.meals)) { problems.push('gün ' + d + ' eksik'); return; }
  const keys = day.meals.map(m => m && m.k);
  ['k', 'a1', 'o', 'a2', 'ak', 'g'].forEach(k => { if (keys.indexOf(k) < 0) problems.push('gün ' + d + ': ' + k + ' öğünü yok'); });
  day.meals.forEach(m => { if (!m || typeof m.t !== 'string' || !m.t.trim()) problems.push('gün ' + d + ' ' + (m && m.k) + ': metin boş'); ((m && m.r) || []).forEach(id => { if (!known.has(id)) problems.push('gün ' + d + ' ' + m.k + ': bilinmeyen tarif ' + id); }); });
  const old = base.days[d];
  day.meals.forEach(m => { const o = old && old.meals.find(x => x.k === m.k); if (!o || o.t !== m.t) changes.push(DAY_NAMES[d] + ' ' + m.k + ': ' + (o ? '"' + o.t.slice(0, 50) + '" → ' : '') + '"' + String(m.t).slice(0, 50) + '"'); });
  base.days[d] = { name: DAY_NAMES[d], tip: day.tip || (old ? old.tip : ''), meals: day.meals };
});
['1', '2', '3', '4', '5', '6', '0'].forEach(d => { if (!base.days[d]) problems.push('gün ' + d + ' yok'); });
const rationale = String(rev.review || '').slice(0, 1500);
sandbox.__doc = { ws: ws, days: base.days, recipes: full ? freshRecipes : [], meta: { source: 'seed', createdAt: new Date().toISOString(), by: 'E', rationale: rationale } };
let merged = vm.runInContext('normWeekMenu(__doc, ' + JSON.stringify(ws) + ')', sandbox);
if (!merged) { console.log(JSON.stringify({ problems: problems.concat(['normWeekMenu başarısız (hiç gün kalmadı)']), changes: [], patched: [], auditLeft: [], recipes: added })); process.exit(2); }
if (Object.keys(merged.days).length < 7) problems.push('normalize sonrası ' + Object.keys(merged.days).length + ' gün kaldı');
// 3) denetim: tarif malzemesi eksikse pişirme gününün listesine ekle, yeniden denetle
sandbox.__merged = merged;
let rows = vm.runInContext('auditWeekDoc(__merged)', sandbox);
const patched = [];
rows.forEach(r => { const m = merged.days[r.dow] && merged.days[r.dow].meals.find(x => x.k === r.k); if (!m) return; const q = r.kind === 'low' ? Math.max(0.5, Math.ceil(r.item.q - Number(r.have[1]))) : r.item.q; m.s = (m.s || []).concat([[r.item.name, q, r.item.u, r.item.c, false]]); patched.push(DAY_NAMES[r.dow] + ' ' + r.k + ': ' + r.item.name + ' ' + q + ' ' + r.item.u); });
if (patched.length) { sandbox.__doc = merged; merged = vm.runInContext('normWeekMenu(__doc, ' + JSON.stringify(ws) + ')', sandbox); sandbox.__merged = merged; rows = vm.runInContext('auditWeekDoc(__merged)', sandbox); }
fs.mkdirSync(outdir, { recursive: true });
const outFile = path.join(outdir, 'merged_' + ws + '.json');
fs.writeFileSync(outFile, JSON.stringify(merged, null, 1), 'utf8');
console.log(JSON.stringify({ problems: problems, recipes: added, changes: changes, patched: patched, auditLeft: rows.map(r => DAY_NAMES[r.dow] + ' ' + r.k + ' ' + r.item.name), days: Object.keys(merged.days).length, out: outFile }, null, 1));
if (problems.length) process.exit(2);
