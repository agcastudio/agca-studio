// agca.studio Worker: statik varlıklar (Hugo çıktısı) + /api/takip
// /api/takip: /duzentakip/ sayfalarının çevrimiçi kaydı. Üç hesap (E: erkek, K: kadin/Selen, S: sevinc/Sevinç), her birinin
// kendi şifresi var. Günlük kayıtlar ve ayarlar hesaba özel; tarifler, haftalık plan ve değişiklik kaydı ortak.
// Veriler SQLite destekli tek Durable Object içinde tutulur; üçüncü taraf servis yok.
const API_PREFIX = '/api/takip';
const COLS = {
  logs: /^[EKS]_\d{4}-\d{2}-\d{2}$/,
  settings: /^(E|K|S|rewards)$/,
  recipes: /^[a-z0-9-]{1,24}$/,
  weekmenus: /^\d{4}-\d{2}-\d{2}$/,
  changelog: /^[a-z0-9]{1,24}$/
};
const SHARED = { recipes: true, weekmenus: true, changelog: true };
const SHARED_OWNER = '_'; // ortak belgelerin sahibi (kişi kodları E, K, S)
const ACCOUNTS = ['E', 'K', 'S'];
const MAX_BODY = 1500000, MAX_DOC = 120000, MAX_DOCS = 600, MAX_SESSIONS = 20;
const LOGIN_WINDOW_MS = 15 * 60 * 1000, LOGIN_MAX = 12, SESSION_DAYS = 400;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === API_PREFIX || url.pathname.startsWith(API_PREFIX + '/')) {
      if (!env.TAKIP) return fail(500, 'no_store', 'Depolama bağlı değil.');
      const stub = env.TAKIP.get(env.TAKIP.idFromName('ev'));
      return stub.fetch(request);
    }
    // Takip sayfaları Worker üzerinden, önbelleksiz: uç önbellek yeni dağıtımdan sonra eski sayfayı sunabiliyordu (9 Kas 2026).
    if (url.pathname.startsWith('/duzentakip/')) {
      const res = await env.ASSETS.fetch(request);
      const h = new Headers(res.headers);
      h.set('Cache-Control', 'no-store');
      h.set('X-Robots-Tag', 'noindex, nofollow, noimageindex, noarchive');
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
    }
    return env.ASSETS.fetch(request);
  }
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}
function fail(status, code, message) { return json({ error: code, message: message }, status); }
function httpError(status, code, message) { const e = new Error(message); e.status = status; e.code = code; return e; }
function hex(bytes) { return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''); }
function b64url(bytes) { let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function randomToken() { return b64url(crypto.getRandomValues(new Uint8Array(32))); }
async function sha256Hex(s) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))); }
function safeEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const isKey = k => typeof k === 'string' && /^[0-9a-f]{64}$/.test(k);
const acctOf = v => (ACCOUNTS.indexOf(v) >= 0 ? v : null);
const nowIso = () => new Date().toISOString();
// Which account may write a document: shared collections → 'S'; logs and settings only the owner's.
function ownerFor(col, id, acct) {
  if (SHARED[col]) return SHARED_OWNER;
  if (col === 'logs') return id.slice(0, 2) === acct + '_' ? acct : null;
  if (col === 'settings') return (id === acct || id === 'rewards') ? acct : null;
  return null;
}

export class TakipStore {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.sql = ctx.storage.sql; this.ready = false; }
  init() {
    if (this.ready) return;
    this.sql.exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS sessions (th TEXT PRIMARY KEY, person TEXT NOT NULL, label TEXT NOT NULL, created TEXT NOT NULL, last_seen TEXT NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS attempts (ip TEXT PRIMARY KEY, n INTEGER NOT NULL, first_ms INTEGER NOT NULL)');
    if (Number(this.getMeta('schema') || 1) < 2) this.migrateV2();
    if (Number(this.getMeta('schema') || 1) < 3) this.migrateV3();
    this.sql.exec('CREATE TABLE IF NOT EXISTS docs (owner TEXT NOT NULL, col TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, updated_at TEXT NOT NULL, rev INTEGER NOT NULL, PRIMARY KEY (owner, col, id))');
    this.sql.exec('CREATE INDEX IF NOT EXISTS docs_rev ON docs (rev)');
    this.ready = true;
  }
  // v1 → v2: one household password and one document table → two accounts. Documents get an owner
  // (E, K or S for shared); the old rewards document is copied to both accounts; the old password goes to
  // every account that had a session (both when there were none).
  migrateV2() {
    const def = this.sql.exec("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'docs'").toArray();
    if (def.length) {
      if (!/\bowner\b/.test(String(def[0].sql || ''))) {
        this.sql.exec('CREATE TABLE docs_v2 (owner TEXT NOT NULL, col TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, updated_at TEXT NOT NULL, rev INTEGER NOT NULL, PRIMARY KEY (owner, col, id))');
        const rows = this.sql.exec('SELECT col, id, body, updated_at, rev FROM docs').toArray();
        for (const r of rows) {
          const owners = SHARED[r.col] ? [SHARED_OWNER] : r.col === 'logs' ? [r.id.charAt(0)] : r.col === 'settings' ? (r.id === 'rewards' ? ['E', 'K'] : [r.id]) : [];
          for (const o of owners) this.sql.exec('INSERT OR REPLACE INTO docs_v2 (owner, col, id, body, updated_at, rev) VALUES (?, ?, ?, ?, ?, ?)', o, r.col, r.id, r.body, r.updated_at, r.rev);
        }
        this.sql.exec('DROP TABLE docs');
        this.sql.exec('ALTER TABLE docs_v2 RENAME TO docs');
      }
    }
    const salt = this.getMeta('pass_salt'), hash = this.getMeta('pass_hash');
    if (salt && hash) {
      let who = this.sql.exec('SELECT DISTINCT person FROM sessions').toArray().map(r => r.person).filter(p => p === 'E' || p === 'K');
      // (v2 döneminde yalnız E ve K vardı)
      if (!who.length) who = ['E', 'K'];
      for (const p of who) {
        if (this.getMeta('pass_hash:' + p)) continue;
        this.setMeta('pass_salt:' + p, salt); this.setMeta('pass_hash:' + p, hash); this.setMeta('pass_set_at:' + p, this.getMeta('pass_set_at') || nowIso());
      }
      this.sql.exec("DELETE FROM meta WHERE k IN ('pass_salt', 'pass_hash', 'pass_set_at')");
    }
    this.setMeta('schema', '2');
  }
  // v2 → v3: ortak belgelerin sahibi 'S' yerine '_' (S artık Sevinç'in kişi kodu).
  migrateV3() {
    const hasDocs = this.sql.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'docs'").toArray().length > 0;
    if (hasDocs) this.sql.exec("UPDATE docs SET owner = ? WHERE owner = 'S'", SHARED_OWNER);
    this.setMeta('schema', '3');
  }
  getMeta(k) { const r = this.sql.exec('SELECT v FROM meta WHERE k = ?', k).toArray(); return r.length ? r[0].v : null; }
  setMeta(k, v) { this.sql.exec('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', k, v); }
  curRev() { return Number(this.getMeta('rev') || 0); }
  nextRev() { const r = this.curRev() + 1; this.setMeta('rev', String(r)); return r; }

  async fetch(request) {
    try { this.init(); return await this.route(request); }
    catch (e) {
      if (e && e.status) return fail(e.status, e.code || 'error', e.message);
      return fail(500, 'server', 'Sunucu hatası: ' + String(e && e.message || e).slice(0, 200));
    }
  }
  async readJson(request) {
    if (Number(request.headers.get('content-length') || 0) > MAX_BODY) throw httpError(413, 'too_large', 'İstek çok büyük.');
    const text = await request.text();
    if (text.length > MAX_BODY) throw httpError(413, 'too_large', 'İstek çok büyük.');
    try { const v = JSON.parse(text || '{}'); return v && typeof v === 'object' ? v : {}; }
    catch (e) { throw httpError(400, 'bad_json', 'Geçersiz JSON.'); }
  }
  async requireSession(request) {
    const m = /^Bearer\s+([A-Za-z0-9_-]{20,100})$/.exec(request.headers.get('authorization') || '');
    if (!m) return null;
    const th = await sha256Hex(m[1]);
    const rows = this.sql.exec('SELECT th, person, label, created, last_seen FROM sessions WHERE th = ?', th).toArray();
    if (!rows.length) return null;
    const row = rows[0];
    if (!acctOf(row.person) || Date.now() - Date.parse(row.created) > SESSION_DAYS * 86400000) { this.sql.exec('DELETE FROM sessions WHERE th = ?', th); return null; }
    if (!row.last_seen || Date.now() - Date.parse(row.last_seen) > 60000) { row.last_seen = nowIso(); this.sql.exec('UPDATE sessions SET last_seen = ? WHERE th = ?', row.last_seen, th); }
    return row;
  }
  rateCheck(ip) {
    const now = Date.now();
    const rows = this.sql.exec('SELECT n, first_ms FROM attempts WHERE ip = ?', ip).toArray();
    if (!rows.length || now - rows[0].first_ms > LOGIN_WINDOW_MS) {
      this.sql.exec('INSERT INTO attempts (ip, n, first_ms) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET n = 1, first_ms = excluded.first_ms', ip, now);
      return true;
    }
    if (rows[0].n >= LOGIN_MAX) return false;
    this.sql.exec('UPDATE attempts SET n = n + 1 WHERE ip = ?', ip);
    return true;
  }
  hasPassword(acct) { return !!this.getMeta('pass_hash:' + acct); }
  async verifyKey(acct, key) {
    const salt = this.getMeta('pass_salt:' + acct), hash = this.getMeta('pass_hash:' + acct);
    if (!salt || !hash) return false;
    return safeEq(await sha256Hex(salt + ':' + key), hash);
  }
  async setKey(acct, key) {
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    this.setMeta('pass_salt:' + acct, salt);
    this.setMeta('pass_hash:' + acct, await sha256Hex(salt + ':' + key));
    this.setMeta('pass_set_at:' + acct, nowIso());
  }
  async newSession(acct, label) {
    const token = randomToken(), th = await sha256Hex(token), now = nowIso();
    this.sql.exec('INSERT INTO sessions (th, person, label, created, last_seen) VALUES (?, ?, ?, ?, ?)', th, acct, label, now, now);
    const extra = this.sql.exec('SELECT th FROM sessions WHERE person = ? ORDER BY last_seen DESC LIMIT -1 OFFSET ?', acct, MAX_SESSIONS).toArray();
    extra.forEach(r => this.sql.exec('DELETE FROM sessions WHERE th = ?', r.th));
    return token;
  }
  me(row) {
    const sessions = this.sql.exec('SELECT th, person, label, created, last_seen FROM sessions WHERE person = ? ORDER BY last_seen DESC LIMIT ?', row.person, MAX_SESSIONS).toArray()
      .map(s => ({ person: s.person, label: s.label, created: s.created, lastSeen: s.last_seen, current: s.th === row.th }));
    const docs = this.sql.exec('SELECT COUNT(*) AS n FROM docs WHERE owner = ? OR owner = ?', row.person, SHARED_OWNER).one().n;
    return { person: row.person, label: row.label, created: row.created, passSetAt: this.getMeta('pass_set_at:' + row.person), sessions: sessions, docs: docs };
  }
  changedSince(rev, acct, skip) {
    const rows = this.sql.exec('SELECT col, id, body, updated_at, rev FROM docs WHERE rev > ? AND (owner = ? OR owner = ?) ORDER BY rev ASC LIMIT 5000', rev, acct, SHARED_OWNER).toArray();
    const out = [];
    for (const r of rows) {
      if (skip && skip.has(r.col + '/' + r.id)) continue;
      let body; try { body = JSON.parse(r.body); } catch (e) { continue; }
      out.push({ col: r.col, id: r.id, body: body, updatedAt: r.updated_at, rev: r.rev });
    }
    return out;
  }
  upsert(docs, acct) {
    const applied = [], rejected = [];
    for (const d of docs) {
      if (!d || typeof d !== 'object') continue;
      const col = String(d.col || ''), id = String(d.id || '');
      if (!COLS[col] || !COLS[col].test(id) || !d.body || typeof d.body !== 'object') { rejected.push(col + '/' + id); continue; }
      const owner = ownerFor(col, id, acct);
      if (!owner) { rejected.push(col + '/' + id); continue; }
      const body = JSON.stringify(d.body);
      if (body.length > MAX_DOC) { rejected.push(col + '/' + id); continue; }
      const at = typeof d.updatedAt === 'string' && d.updatedAt.length <= 30 ? d.updatedAt : nowIso();
      const cur = this.sql.exec('SELECT updated_at FROM docs WHERE owner = ? AND col = ? AND id = ?', owner, col, id).toArray();
      if (cur.length && cur[0].updated_at >= at) { rejected.push(col + '/' + id); continue; }
      const rev = this.nextRev();
      this.sql.exec('INSERT INTO docs (owner, col, id, body, updated_at, rev) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(owner, col, id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at, rev = excluded.rev', owner, col, id, body, at, rev);
      applied.push(col + '/' + id);
    }
    return { applied: applied, rejected: rejected };
  }
  async route(request) {
    const url = new URL(request.url);
    const path = url.pathname.slice(API_PREFIX.length) || '/', method = request.method.toUpperCase();
    const ip = request.headers.get('cf-connecting-ip') || 'local';
    if (path === '/status' && method === 'GET') {
      const p = acctOf(url.searchParams.get('person'));
      const all = {}; ACCOUNTS.forEach(a => { all[a] = this.hasPassword(a); });
      return json({ ok: true, hasPassword: p ? this.hasPassword(p) : all, rev: this.curRev(), now: nowIso() });
    }
    if (path === '/login' && method === 'POST') {
      if (!this.rateCheck(ip)) return fail(429, 'rate_limited', 'Çok fazla deneme; 15 dakika sonra tekrar deneyin.');
      const b = await this.readJson(request);
      const acct = acctOf(b.person);
      if (!acct) return fail(400, 'bad_person', 'Hesap belirtilmedi.');
      if (!isKey(b.key)) return fail(400, 'bad_key', 'Geçersiz anahtar.');
      const label = String(b.label || 'cihaz').slice(0, 60);
      let first = false;
      if (!this.hasPassword(acct)) { await this.setKey(acct, b.key); first = true; }
      else if (!(await this.verifyKey(acct, b.key))) return fail(401, 'wrong_password', 'Şifre yanlış.');
      this.sql.exec('DELETE FROM attempts WHERE ip = ?', ip);
      const token = await this.newSession(acct, label);
      return json({ token: token, first: first, person: acct, rev: this.curRev(), now: nowIso() });
    }
    const row = await this.requireSession(request);
    if (!row) return fail(401, 'unauthorized', 'Giriş gerekli.');
    const acct = row.person;
    if (path === '/me' && method === 'GET') return json(this.me(row));
    if (path === '/logout' && method === 'POST') { this.sql.exec('DELETE FROM sessions WHERE th = ?', row.th); return json({ ok: true }); }
    if (path === '/password' && method === 'POST') {
      const b = await this.readJson(request);
      if (!isKey(b.oldKey) || !isKey(b.newKey)) return fail(400, 'bad_key', 'Geçersiz anahtar.');
      if (!(await this.verifyKey(acct, b.oldKey))) return fail(401, 'wrong_password', 'Mevcut şifre yanlış.');
      await this.setKey(acct, b.newKey);
      this.sql.exec('DELETE FROM sessions WHERE person = ?', acct);
      const token = await this.newSession(acct, row.label);
      return json({ token: token, person: acct, now: nowIso() });
    }
    if (path === '/sync' && method === 'GET') {
      const rev = Math.max(0, Number(url.searchParams.get('rev')) || 0);
      return json({ rev: this.curRev(), person: acct, docs: this.changedSince(rev, acct), applied: [], rejected: [], me: this.me(row), now: nowIso() });
    }
    if (path === '/sync' && method === 'POST') {
      const b = await this.readJson(request);
      const since = Math.max(0, Number(b.rev) || 0), docs = Array.isArray(b.docs) ? b.docs.slice(0, MAX_DOCS) : [];
      const res = this.upsert(docs, acct);
      return json({ rev: this.curRev(), person: acct, docs: this.changedSince(since, acct, new Set(res.applied)), applied: res.applied, rejected: res.rejected, me: this.me(row), now: nowIso() });
    }
    return fail(404, 'not_found', 'Böyle bir uç yok.');
  }
}
