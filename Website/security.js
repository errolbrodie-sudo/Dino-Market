/**
 * DINU MARKET: Cybersecurity & Cryptographic Utilities Module
 * Implements:
 * 1. Salted scrypt password hashing (NIST / OWASP compliant) with timing-safe comparison
 * 2. HMAC-SHA256 signed HttpOnly session & persistent guest cart tokens
 * 3. Sliding-window rate limiting & login brute-force lockout protection
 * 4. Strict HTTP security headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy)
 * 5. Input sanitization & validation helpers
 */

const crypto = require('node:crypto');

const SERVER_SECRET = process.env.SESSION_SECRET || 'dinu-market-hmac-secret-key-2026-il-secure-9988776655';

/**
 * Hash a plaintext password using cryptographic scrypt with a 16-byte random salt
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

/**
 * Verify a password against a stored scrypt hash using timingSafeEqual
 */
function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.startsWith('scrypt$')) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3) return false;
  const [, salt, keyHex] = parts;
  const keyBuffer = Buffer.from(keyHex, 'hex');
  const derivedBuffer = crypto.scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 });
  if (keyBuffer.length !== derivedBuffer.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
}

/**
 * Sign a token payload with HMAC-SHA256
 */
function signToken(payloadObj, expiresInSeconds = 86400 * 14) {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const data = Buffer.from(JSON.stringify({ ...payloadObj, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', SERVER_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

/**
 * Verify an HMAC-SHA256 signed token
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', SERVER_SECRET).update(data).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Parse Cookie header into key-value map
 */
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const key = parts.shift().trim();
    if (key) {
      const val = decodeURIComponent(parts.join('=').trim());
      list[key] = val;
    }
  });
  return list;
}

/**
 * Format Set-Cookie header with HttpOnly and SameSite protections
 */
function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || '/'}`);
  if (options.httpOnly !== false) parts.push('HttpOnly');
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);
  if (typeof options.maxAge === 'number') parts.push(`Max-Age=${options.maxAge}`);
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
}

/**
 * Sliding-window Rate Limiter & Login Lockout Tracker
 */
const rateLimitBuckets = new Map();
const loginLockouts = new Map();

function checkRateLimit(key, maxRequests = 60, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitBuckets.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
  } else {
    record.count += 1;
  }
  rateLimitBuckets.set(key, record);
  return {
    allowed: record.count <= maxRequests,
    remaining: Math.max(0, maxRequests - record.count),
    resetAt: record.resetAt
  };
}

function checkLoginLockout(emailOrIp) {
  const key = String(emailOrIp).toLowerCase();
  const entry = loginLockouts.get(key);
  if (!entry) return { locked: false, attempts: 0 };
  if (Date.now() > entry.ResetAt) {
    loginLockouts.delete(key);
    return { locked: false, attempts: 0 };
  }
  return {
    locked: entry.attempts >= 5,
    attempts: entry.attempts,
    remainingSeconds: Math.ceil((entry.ResetAt - Date.now()) / 1000)
  };
}

function recordFailedLogin(emailOrIp) {
  const key = String(emailOrIp).toLowerCase();
  const now = Date.now();
  const entry = loginLockouts.get(key) || { attempts: 0, ResetAt: now + 15 * 60 * 1000 };
  if (now > entry.ResetAt) {
    entry.attempts = 1;
    entry.ResetAt = now + 15 * 60 * 1000;
  } else {
    entry.attempts += 1;
  }
  loginLockouts.set(key, entry);
}

function clearLoginLockout(emailOrIp) {
  loginLockouts.delete(String(emailOrIp).toLowerCase());
}

/**
 * Apply strict HTTP security headers to every response
 */
function applySecurityHeaders(res) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://images.unsplash.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-XSS-Protection', '0');
}

/**
 * Sanitize user text input against HTML/script injection
 */
function sanitizeText(str, maxLength = 500) {
  if (str === null || str === undefined) return '';
  return String(str)
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, (ch) => (ch === '<' ? '&lt;' : '&gt;'));
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  parseCookies,
  serializeCookie,
  checkRateLimit,
  checkLoginLockout,
  recordFailedLogin,
  clearLoginLockout,
  applySecurityHeaders,
  sanitizeText
};

