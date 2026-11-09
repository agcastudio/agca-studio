// Runs the assembled app scripts (check.js from the build) against a tiny DOM shim and renders every tab.
// usage: node smoke.js <check.js> [E|K]
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(process.argv[2], 'utf8');
const person = process.argv[3] === 'K' ? 'K' : 'E';
const out = {}, store = new Map();
function el(sel) {
  return {
    sel, hidden: false, textContent: '', value: '', open: false, dataset: {},
    set innerHTML(v) { out[sel] = v; }, get innerHTML() { return out[sel] || ''; },
    classList: { toggle() {}, add() {}, remove() {} }, addEventListener() {}, focus() {}, select() {}, scrollTo() {}, scrollIntoView() {}, closest() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; }, clientWidth: 360, scrollLeft: 0
  };
}
const document = {
  querySelector: s => el(s), querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, activeElement: null, visibilityState: 'visible'
};
const sandbox = {
  console, document, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: f => 0, Date, Math, JSON, Number, String, Array, Object, Set, Map, Promise, RegExp, Error, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, TextEncoder, crypto: globalThis.crypto, fetch: async () => { throw new Error('no network in smoke test'); },
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  navigator: { userAgent: 'node smoke', clipboard: {} }, location: { hash: '' }, PERSON_LOCK: person
};
sandbox.addEventListener = () => {}; sandbox.removeEventListener = () => {}; sandbox.scrollTo = () => {};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
try { vm.runInContext(code, sandbox, { filename: 'check.js' }); } catch (e) { console.error('BOOT ERROR', e && e.stack || e); process.exit(1); }
const run = (name, fn) => { try { fn(); console.log('ok  ' + name); } catch (e) { console.error('ERR ' + name + ': ' + (e && e.stack || e)); process.exitCode = 1; } };
run('renderToday', () => vm.runInContext('renderToday()', sandbox));
run('renderProgram', () => vm.runInContext('renderProgram()', sandbox));
run('renderRecipes', () => vm.runInContext('renderRecipes()', sandbox));
run('renderSettings', () => vm.runInContext('renderSettings()', sandbox));
run('renderShopping', () => vm.runInContext('renderShopping()', sandbox));
if (process.argv[4] === 'cats') console.log(vm.runInContext('allRecipes().map(r => recipeCat(r).id + ": " + r.name + " [" + r.tags.join(", ") + "]").sort().join("\\n")', sandbox));
const bugun = out['#view-bugun'] || '', menu = out['#view-program'] || '', tar = out['#view-tarifler'] || '', set = out['#view-ayarlar'] || '';
const h2 = html => Array.from(html.matchAll(/<h2>([^<]*)<\/h2>/g)).map(m => m[1]);
const cats = Array.from(tar.matchAll(/id="cat-([a-z]+)"/g)).map(m => m[1]);
console.log(JSON.stringify({ person, bugunNeYedik: /Ne yedik/.test(bugun), bugunLen: bugun.length, menuCards: h2(menu), tariflerCards: h2(tar), categories: cats, planDays: (menu.match(/data-plan-day=/g) || []).length, openDays: (menu.match(/data-plan-day="[^"]+" open/g) || []).length, settingsCards: h2(set) }, null, 1));
