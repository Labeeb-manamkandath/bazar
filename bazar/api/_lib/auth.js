// Admin authentication: PBKDF2 password hashes, signed HttpOnly session cookie, login rate limiting.
const crypto = require('crypto');
const db = require('./db');

const COOKIE = 'bazar_admin';
const SESSION_HOURS = 8;
const ITER = 210000;

function b64u(buf) { return Buffer.from(buf).toString('base64url'); }

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 24) {
    if (process.env.VERCEL) throw new Error('SESSION_SECRET is not set');
    return 'local-dev-secret-not-for-production-use';
  }
  return s;
}

/* ----- password hashing: pbkdf2$sha256$iterations$saltB64u$hashB64u ----- */
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, ITER, 32, 'sha256');
  return `pbkdf2$sha256$${ITER}$${b64u(salt)}$${b64u(hash)}`;
}

function verifyPassword(password, stored) {
  try {
    const [kind, algo, iter, salt, hash] = String(stored).split('$');
    if (kind !== 'pbkdf2' || algo !== 'sha256') return false;
    const test = crypto.pbkdf2Sync(password, Buffer.from(salt, 'base64url'), parseInt(iter, 10), 32, 'sha256');
    const want = Buffer.from(hash, 'base64url');
    return want.length === test.length && crypto.timingSafeEqual(want, test);
  } catch { return false; }
}

/* ----- credentials: a password changed in the portal (stored hash) wins over the env var ----- */
async function getCredentials() {
  const saved = await db.getSetting('admin_account');
  return {
    username: process.env.ADMIN_USERNAME || '',
    hash: (saved && saved.hash) || process.env.ADMIN_PASSWORD_HASH || '',
  };
}

/* ----- signed session token ----- */
function sign(payload) {
  const body = b64u(JSON.stringify(payload));
  const mac = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${mac}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const want = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!p.exp || Date.now() > p.exp) return null;
    return p;
  } catch { return null; }
}

function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function isSecure(req) {
  return !!process.env.VERCEL || (req.headers['x-forwarded-proto'] || '').includes('https');
}

function setSession(req, res, username) {
  const token = sign({ u: username, exp: Date.now() + SESSION_HOURS * 3600 * 1000 });
  res.setHeader('Set-Cookie',
    `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}${isSecure(req) ? '; Secure' : ''}`);
}

function clearSession(req, res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${isSecure(req) ? '; Secure' : ''}`);
}

function getSession(req) {
  return verifyToken(parseCookies(req)[COOKIE]);
}

/* ----- login rate limiting (stored in the database, so it works across serverless instances) ----- */
const MAX_FAILS = 5;
const LOCK_MIN = 15;

function clientKey(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  return 'rl_' + crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24);
}

async function checkLock(req) {
  const rec = await db.getSetting(clientKey(req));
  if (rec && rec.lockedUntil && Date.now() < rec.lockedUntil) {
    return Math.ceil((rec.lockedUntil - Date.now()) / 60000);
  }
  return 0;
}

async function recordFail(req) {
  const key = clientKey(req);
  const rec = (await db.getSetting(key)) || { count: 0 };
  const stale = rec.last && Date.now() - rec.last > LOCK_MIN * 60000;
  const count = (stale ? 0 : rec.count || 0) + 1;
  const next = { count, last: Date.now() };
  if (count >= MAX_FAILS) { next.lockedUntil = Date.now() + LOCK_MIN * 60000; next.count = 0; }
  await db.setSetting(key, next);
}

async function clearFails(req) {
  const key = clientKey(req);
  const rec = await db.getSetting(key);
  if (rec) await db.setSetting(key, { count: 0 });
}

module.exports = {
  hashPassword, verifyPassword, getCredentials, setSession, clearSession, getSession,
  checkLock, recordFail, clearFails, LOCK_MIN,
};
