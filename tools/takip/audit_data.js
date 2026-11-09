// Audits recipe ingredients against shopping items for the code weeks and the standard week; writes app_b4.html (SHOP_PATCH) with the missing items.
const fs = require('fs'), vm = require('vm'), path = require('path');
const sp = process.argv[2], mode = process.argv[3] || 'write';
function load(files) {
  const code = files.map(f => fs.existsSync(path.join(sp, f)) ? Array.from(fs.readFileSync(path.join(sp, f), 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)).map(m => m[1]).join('\n') : '').join('\n');
  const ctx = { window: {}, console: console }; ctx.globalThis = ctx;
  vm.runInNewContext(code + '\n;globalThis.__o = { codeWeekDoc: codeWeekDoc, auditWeekDoc: auditWeekDoc, recipeItems: recipeItems, RECIPES: RECIPES, findRecipe: findRecipe, shopItemsFor: shopItemsFor, DAY_NAMES: DAY_NAMES, MEAL_NAMES: MEAL_NAMES };', ctx);
  return ctx.__o;
}
const files = ['app_b.html', 'app_b2.html', 'app_b3.html'].concat(mode === 'verify' ? ['app_b4.html'] : []).concat(['app_c.html', 'app_c4.html']);
const o = load(files);
const weeks = { '2026-11-09': '2026-11-09', '2026-11-16': '2026-11-16', 'default': '2026-11-23' };
const patch = {}; let total = 0;
for (const key of Object.keys(weeks)) {
  const ws = weeks[key], doc = o.codeWeekDoc(ws), rows = o.auditWeekDoc(doc);
  console.log('== ' + key + ' (' + ws + '): ' + rows.length + ' bulgu');
  rows.forEach(r => {
    const need = r.kind === 'low' ? Math.max(1, Math.ceil(r.item.q - Number(r.have[1]))) : r.item.q;
    console.log('  ' + o.DAY_NAMES[r.dow] + ' ' + o.MEAL_NAMES[r.k] + ' · ' + r.recipe + ' → ' + r.item.name + ' ' + need + ' ' + r.item.u + ' [' + r.item.c + ']' + (r.kind === 'low' ? ' (listede ' + r.have[1] + ' ' + r.have[2] + ')' : ''));
    patch[key] = patch[key] || {}; patch[key][r.dow] = patch[key][r.dow] || {}; patch[key][r.dow][r.k] = patch[key][r.dow][r.k] || [];
    patch[key][r.dow][r.k].push([r.item.name, need, r.item.u, r.item.c]);
    total++;
  });
}
if (mode === 'write') {
  const body = '<script>\n\'use strict\';\n// Tariflerden türetilen, öğün listelerinde eksik olan alışveriş kalemleri (audit_data.js üretir; elle düzenlemeyin).\nconst SHOP_PATCH = ' + JSON.stringify(patch) + ';\n</script>\n';
  fs.writeFileSync(path.join(sp, 'app_b4.html'), body);
  console.log('SHOP_PATCH written: ' + total + ' kalem');
} else console.log('verify total: ' + total);
