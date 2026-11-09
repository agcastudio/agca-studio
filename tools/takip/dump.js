// Haftalık plan ajanı için veri dökümü: hedef haftanın iskeleti (plan yoksa standart menü), önceki iki haftanın öğle ve
// akşam yemekleri (çeşitlilik için), tüm tarifler ve program kuralları.
//   node tools/takip/dump.js <dist/check.js> <ws: YYYY-MM-DD Pazartesi> <out.json>
const fs = require('fs'), vm = require('vm'), path = require('path');
const code = fs.readFileSync(process.argv[2], 'utf8'), ws = process.argv[3], outFile = process.argv[4];
if (!/^\d{4}-\d{2}-\d{2}$/.test(ws)) { console.error('ws YYYY-MM-DD olmalı'); process.exit(1); }
const store = new Map();
const el = () => ({ hidden: false, set innerHTML(v) {}, classList: { toggle() {} }, addEventListener() {}, textContent: '', value: '', dataset: {}, closest() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; } });
const sandbox = { console, document: { querySelector: el, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, activeElement: null, visibilityState: 'visible' }, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0, Date, Math, JSON, Number, String, Array, Object, Set, Map, Promise, RegExp, Error, isFinite, parseInt, parseFloat, TextEncoder, crypto: globalThis.crypto, fetch: async () => { throw new Error('offline'); }, localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }, navigator: { userAgent: 'node' }, location: { hash: '' }, PERSON_LOCK: 'E', addEventListener() {}, removeEventListener() {}, scrollTo() {} };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const dump = vm.runInContext('(() => { const ws = ' + JSON.stringify(ws) + '; const prev = []; [-7, -14].forEach(off => { const w = addDays(ws, off); for (let i = 0; i < 7; i++) { const d = addDays(w, i); menuFor(d).meals.forEach(x => { if (x.k === "o" || x.k === "ak") prev.push(d + " " + DAY_NAMES[parseD(d).getDay()] + " " + (x.k === "o" ? "öğle" : "akşam") + ": " + x.t.slice(0, 90)); }); } }); const week = codeWeekDoc(ws); return { ws: ws, wsEnd: addDays(ws, 6), week: week, weekSource: week && week.meta ? week.meta.source : "", previousWeeksDishes: prev, recipes: allRecipes(), rules: PLAN_RULES, snacks: SNACKS, drinks: DRINKS, rhythm: RHYTHM, mealTimes: MEAL_TIMES, mealNames: MEAL_NAMES, shopCats: SHOP_CATS, units: SHOP_UNITS }; })()', sandbox);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(dump, null, 1), 'utf8');
console.log('yazıldı ' + outFile + ' · hafta ' + ws + ' (' + dump.weekSource + ') · önceki yemek ' + dump.previousWeeksDishes.length + ' · tarif ' + dump.recipes.length);
