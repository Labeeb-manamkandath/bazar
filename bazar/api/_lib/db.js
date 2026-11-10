// Data layer. Uses Supabase (Postgres + Storage) in production.
// If Supabase is not configured it falls back to a local JSON file, for local testing only.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = process.env.SUPABASE_BUCKET || 'bazar';
const USE_SB = !!(SB_URL && SB_KEY);

const LOCAL_DIR = path.join(process.cwd(), '.data');
const LOCAL_FILE = path.join(LOCAL_DIR, 'db.json');

function configured() {
  return USE_SB || !process.env.VERCEL; // local fallback never allowed on Vercel
}

/* ---------- Supabase REST ---------- */
async function sb(pathname, opts = {}) {
  const res = await fetch(SB_URL + pathname, {
    ...opts,
    headers: {
      apikey: SB_KEY,
      // New-style "sb_secret_..." keys are not JWTs and must be sent only in the apikey header.
      ...(SB_KEY.startsWith('eyJ') ? { Authorization: 'Bearer ' + SB_KEY } : {}),
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && (data.message || data.error || data.hint)) || res.statusText;
    const err = new Error(msg);
    err.status = res.status;
    err.code = data && data.code;
    throw err;
  }
  return data;
}

/* ---------- Local JSON fallback ---------- */
function readLocal() {
  try { return JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8')); }
  catch { return { categories: [], products: [], settings: [] }; }
}
function writeLocal(db) {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(db, null, 2));
}

/* ---------- Generic table API ---------- */
async function all(table) {
  if (USE_SB) return sb(`/rest/v1/${table}?select=*&order=created_at.asc&limit=5000`);
  return readLocal()[table] || [];
}

async function insert(table, row) {
  const now = new Date().toISOString();
  const full = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...row };
  if (USE_SB) {
    const out = await sb(`/rest/v1/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(full),
    });
    return out[0];
  }
  const db = readLocal();
  db[table] = db[table] || [];
  if (table === 'categories' && db[table].some(r => r.slug === full.slug)) { const e = new Error('duplicate'); e.code = '23505'; throw e; }
  if (table === 'products' && db[table].some(r => r.slug === full.slug)) { const e = new Error('duplicate'); e.code = '23505'; throw e; }
  db[table].push(full);
  writeLocal(db);
  return full;
}

async function update(table, id, patch) {
  const body = { ...patch, updated_at: new Date().toISOString() };
  delete body.id; delete body.created_at;
  if (USE_SB) {
    const out = await sb(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(body),
    });
    return out[0] || null;
  }
  const db = readLocal();
  const i = (db[table] || []).findIndex(r => r.id === id);
  if (i < 0) return null;
  if (body.slug && db[table].some(r => r.slug === body.slug && r.id !== id)) { const e = new Error('duplicate'); e.code = '23505'; throw e; }
  db[table][i] = { ...db[table][i], ...body };
  writeLocal(db);
  return db[table][i];
}

async function remove(table, id) {
  if (USE_SB) {
    await sb(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    return true;
  }
  const db = readLocal();
  db[table] = (db[table] || []).filter(r => r.id !== id);
  writeLocal(db);
  return true;
}

/* ---------- Settings (key/value JSON) ---------- */
async function getSetting(key) {
  if (USE_SB) {
    const rows = await sb(`/rest/v1/settings?key=eq.${encodeURIComponent(key)}&select=value`);
    return rows[0] ? rows[0].value : null;
  }
  const row = (readLocal().settings || []).find(s => s.key === key);
  return row ? row.value : null;
}

async function getAllSettings() {
  const rows = USE_SB ? await sb('/rest/v1/settings?select=key,value') : (readLocal().settings || []);
  const out = {};
  rows.forEach(r => { out[r.key] = r.value; });
  return out;
}

async function setSetting(key, value) {
  const row = { key, value, updated_at: new Date().toISOString() };
  if (USE_SB) {
    await sb('/rest/v1/settings?on_conflict=key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(row),
    });
    return value;
  }
  const db = readLocal();
  db.settings = db.settings || [];
  const i = db.settings.findIndex(s => s.key === key);
  if (i >= 0) db.settings[i] = row; else db.settings.push(row);
  writeLocal(db);
  return value;
}

/* ---------- Image storage ---------- */
async function uploadImage(buffer, contentType, name) {
  const ext = contentType === 'image/webp' ? 'webp' : contentType === 'image/png' ? 'png' : 'jpg';
  const file = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${name}.${ext}`;
  if (USE_SB) {
    await sb(`/storage/v1/object/${BUCKET}/${file}`, {
      method: 'POST',
      headers: { 'Content-Type': contentType, 'Cache-Control': 'max-age=31536000', 'x-upsert': 'false' },
      body: buffer,
    });
    return `${SB_URL}/storage/v1/object/public/${BUCKET}/${file}`;
  }
  const dir = path.join(LOCAL_DIR, 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), buffer);
  return `/uploads/${file}`;
}

// Videos are too big to pass through a server function, so the browser uploads them
// straight to Supabase Storage with a one-time signed link made here.
async function signVideoUpload(name, ext) {
  if (!USE_SB) return null;
  const file = `videos/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${name}.${ext}`;
  const r = await sb(`/storage/v1/object/upload/sign/${BUCKET}/${file}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (!r || !r.url) throw new Error('Could not prepare the video upload.');
  return { uploadUrl: `${SB_URL}/storage/v1${r.url}`, publicUrl: `${SB_URL}/storage/v1/object/public/${BUCKET}/${file}` };
}
const STORAGE_PUBLIC = SB_URL ? `${SB_URL}/storage/v1/object/public/${BUCKET}/` : '';

module.exports = { signVideoUpload, STORAGE_PUBLIC, all, insert, update, remove, getSetting, getAllSettings, setSetting, uploadImage, configured, USE_SB };
