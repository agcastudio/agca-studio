// Rutin betiklerini denemek için: mevcut bir kod haftasını ajan çıktısı biçimine çevirir (gerçek ajan yerine).
//   node tools/takip/fake_plan.js <dist/check.js> <ws> <out.json>
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(process.argv[2], 'utf8'), ws = process.argv[3], out = process.argv[4];
const store = new Map();
const el = () => ({ hidden: false, set innerHTML(v) {}, classList: { toggle() {} }, addEventListener() {}, textContent: '', value: '', dataset: {}, closest() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; } });
const sandbox = { console, document: { querySelector: el, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, activeElement: null, visibilityState: 'visible' }, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0, Date, Math, JSON, Number, String, Array, Object, Set, Map, Promise, RegExp, Error, isFinite, parseInt, parseFloat, TextEncoder, crypto: globalThis.crypto, fetch: async () => { throw new Error('offline'); }, localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }, navigator: { userAgent: 'node' }, location: { hash: '' }, PERSON_LOCK: 'E', addEventListener() {}, removeEventListener() {}, scrollTo() {} };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const doc = vm.runInContext('codeWeekDoc(' + JSON.stringify(ws) + ')', sandbox);
const days = {}; Object.keys(doc.days).forEach(d => { days[d] = { tip: doc.days[d].tip, meals: doc.days[d].meals }; });
fs.writeFileSync(out, JSON.stringify({ review: 'Deneme: ' + ws + ' haftası kod planından türetildi.', days: days, recipes: [] }, null, 1), 'utf8');
console.log('yazıldı ' + out + ' (' + Object.keys(days).length + ' gün)');
