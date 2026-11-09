// agca.studio Worker: statik varlıklar (Hugo çıktısı) + /api/takip
// /api/takip: /duzentakip/ sayfalarının çevrimiçi kaydı. Tek haneli ev hesabı (ortak şifre),
// veriler SQLite destekli bir Durable Object içinde tutulur; üçüncü taraf servis yok.
const API_PREFIX = '/api/takip';
const COLS = {
  logs: /^[EK]_\d{4}-\d{2}-\d{2}$/,
  settings: /^(E|K|rewards)$/,
  recipes: /^[a-z0-9-]{1,24}$/,
  weekmenus: /^\d{4}-\d{2}-\d{2}$/,
  changelog: /^[a-z0-9]{1,24}$/
};
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
const nowIso = () => new Date().toISOString();

export class TakipStore {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.sql = ctx.storage.sql; this.ready = false; }
  init() {
    if (this.ready) return;
    this.sql.exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS sessions (th TEXT PRIMARY KEY, person TEXT NOT NULL, label TEXT NOT NULL, created TEXT NOT NULL, last_seen TEXT NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS docs (col TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, updated_at TEXT NOT NULL, rev INTEGER NOT NULL, PRIMARY KEY (col, id))');
    this.sql.exec('CREATE INDEX IF NOT EXISTS docs_rev ON docs (rev)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS attempts (ip TEXT PRIMARY KEY, n INTEGER NOT NULL, first_ms INTEGER NOT NULL)');
    this.ready = true;
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
    if (Date.now() - Date.parse(row.created) > SESSION_DAYS * 86400000) { this.sql.exec('DELETE FROM sessions WHERE th = ?', th); return null; }
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
  async verifyKey(key) {
    const salt = this.getMeta('pass_salt'), hash = this.getMeta('pass_hash');
    if (!salt || !hash) return false;
    return safeEq(await sha256Hex(salt + ':' + key), hash);
  }
  async setKey(key) {
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    this.setMeta('pass_salt', salt);
    this.setMeta('pass_hash', await sha256Hex(salt + ':' + key));
    this.setMeta('pass_set_at', nowIso());
  }
  async newSession(person, label) {
    const token = randomToken(), th = await sha256Hex(token), now = nowIso();
    this.sql.exec('INSERT INTO sessions (th, person, label, created, last_seen) VALUES (?, ?, ?, ?, ?)', th, person, label, now, now);
    const extra = this.sql.exec('SELECT th FROM sessions ORDER BY last_seen DESC LIMIT -1 OFFSET ?', MAX_SESSIONS).toArray();
    extra.forEach(r => this.sql.exec('DELETE FROM sessions WHERE th = ?', r.th));
    return token;
  }
  me(row) {
    const sessions = this.sql.exec('SELECT th, person, label, created, last_seen FROM sessions ORDER BY last_seen DESC LIMIT ?', MAX_SESSIONS).toArray()
      .map(s => ({ person: s.person, label: s.label, created: s.created, lastSeen: s.last_seen, current: s.th === row.th }));
    const docs = this.sql.exec('SELECT COUNT(*) AS n FROM docs').one().n;
    return { person: row.person, label: row.label, created: row.created, passSetAt: this.getMeta('pass_set_at'), sessions: sessions, docs: docs };
  }
  changedSince(rev, skip) {
    const rows = this.sql.exec('SELECT col, id, body, updated_at, rev FROM docs WHERE rev > ? ORDER BY rev ASC LIMIT 5000', rev).toArray();
    const out = [];
    for (const r of rows) {
      if (skip && skip.has(r.col + '/' + r.id)) continue;
      let body; try { body = JSON.parse(r.body); } catch (e) { continue; }
      out.push({ col: r.col, id: r.id, body: body, updatedAt: r.updated_at, rev: r.rev });
    }
    return out;
  }
  upsert(docs) {
    const applied = [];
    for (const d of docs) {
      if (!d || typeof d !== 'object') continue;
      const col = String(d.col || ''), id = String(d.id || '');
      if (!COLS[col] || !COLS[col].test(id) || !d.body || typeof d.body !== 'object') continue;
      const body = JSON.stringify(d.body);
      if (body.length > MAX_DOC) continue;
      const at = typeof d.updatedAt === 'string' && d.updatedAt.length <= 30 ? d.updatedAt : nowIso();
      const cur = this.sql.exec('SELECT updated_at FROM docs WHERE col = ? AND id = ?', col, id).toArray();
      if (cur.length && cur[0].updated_at >= at) continue;
      const rev = this.nextRev();
      this.sql.exec('INSERT INTO docs (col, id, body, updated_at, rev) VALUES (?, ?, ?, ?, ?) ON CONFLICT(col, id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at, rev = excluded.rev', col, id, body, at, rev);
      applied.push(col + '/' + id);
    }
    return applied;
  }
  async route(request) {
    const url = new URL(request.url);
    const path = url.pathname.slice(API_PREFIX.length) || '/', method = request.method.toUpperCase();
    const ip = request.headers.get('cf-connecting-ip') || 'local';
    if (path === '/status' && method === 'GET') return json({ ok: true, hasPassword: !!this.getMeta('pass_hash'), rev: this.curRev(), now: nowIso() });
    if (path === '/login' && method === 'POST') {
      if (!this.rateCheck(ip)) return fail(429, 'rate_limited', 'Çok fazla deneme; 15 dakika sonra tekrar deneyin.');
      const b = await this.readJson(request);
      if (!isKey(b.key)) return fail(400, 'bad_key', 'Geçersiz anahtar.');
      const person = b.person === 'K' ? 'K' : 'E', label = String(b.label || 'cihaz').slice(0, 60);
      let first = false;
      if (!this.getMeta('pass_hash')) { await this.setKey(b.key); first = true; }
      else if (!(await this.verifyKey(b.key))) return fail(401, 'wrong_password', 'Şifre yanlış.');
      this.sql.exec('DELETE FROM attempts WHERE ip = ?', ip);
      const token = await this.newSession(person, label);
      return json({ token: token, first: first, rev: this.curRev(), now: nowIso() });
    }
    const row = await this.requireSession(request);
    if (!row) return fail(401, 'unauthorized', 'Giriş gerekli.');
    if (path === '/me' && method === 'GET') return json(this.me(row));
    if (path === '/logout' && method === 'POST') { this.sql.exec('DELETE FROM sessions WHERE th = ?', row.th); return json({ ok: true }); }
    if (path === '/password' && method === 'POST') {
      const b = await this.readJson(request);
      if (!isKey(b.oldKey) || !isKey(b.newKey)) return fail(400, 'bad_key', 'Geçersiz anahtar.');
      if (!(await this.verifyKey(b.oldKey))) return fail(401, 'wrong_password', 'Mevcut şifre yanlış.');
      await this.setKey(b.newKey);
      this.sql.exec('DELETE FROM sessions');
      const token = await this.newSession(row.person, row.label);
      return json({ token: token, now: nowIso() });
    }
    if (path === '/sync' && method === 'GET') {
      const rev = Math.max(0, Number(url.searchParams.get('rev')) || 0);
      return json({ rev: this.curRev(), docs: this.changedSince(rev), applied: [], me: this.me(row), now: nowIso() });
    }
    if (path === '/sync' && method === 'POST') {
      const b = await this.readJson(request);
      const since = Math.max(0, Number(b.rev) || 0), docs = Array.isArray(b.docs) ? b.docs.slice(0, MAX_DOCS) : [];
      const applied = this.upsert(docs);
      return json({ rev: this.curRev(), docs: this.changedSince(since, new Set(applied)), applied: applied, me: this.me(row), now: nowIso() });
    }
    return fail(404, 'not_found', 'Böyle bir uç yok.');
  }
}
