// auth.js — Authentication, password hashing, and role authorization for ACADSYNC.
//
// 1. Password hashing via native node:crypto (scrypt + random salt).
// 2. Self-contained signed session tokens (HMAC-SHA256).
// 3. User creation and authentication against the local SQLite database.
// 4. Role enforcement middleware for Admin, Teacher, and Student.

const crypto = require("node:crypto");
const { db, fromRow } = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "acadsync-local-token-secret-v2";
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// --- Helper Functions ---
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str) {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return Buffer.from(b64, "base64").toString("utf-8");
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function signToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const fullPayload = { ...payload, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") throw new Error("Missing token");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error("Invalid token signature");
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new Error("Malformed token payload");
  }
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error("Token expired");
  }

  return payload;
}

// --- User Operations ---
function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, salt, ...safeUser } = user;
  return safeUser;
}

function createUser({ name, email, password, role, teacher_id = null, class_id = null }) {
  if (!name || !email || !password || !role) {
    throw new Error("name, email, password, and role are required");
  }

  if (!["admin", "teacher", "student"].includes(role)) {
    throw new Error("role must be 'admin', 'teacher', or 'student'");
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase().trim());
  if (existing) {
    throw new Error(`User with email "${email}" already exists`);
  }

  const id = crypto.randomUUID();
  const salt = generateSalt();
  const password_hash = hashPassword(password, salt);
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, salt, role, teacher_id, class_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, email.toLowerCase().trim(), password_hash, salt, role, teacher_id, class_id, now, now);

  const created = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  return sanitizeUser(created);
}

function authenticate(email, password) {
  if (!email || !password) throw new Error("Email and password are required");

  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());
  if (!row) throw new Error("Invalid email or password");

  const expectedHash = hashPassword(password, row.salt);
  if (!crypto.timingSafeEqual(Buffer.from(row.password_hash), Buffer.from(expectedHash))) {
    throw new Error("Invalid email or password");
  }

  const user = sanitizeUser(row);
  const token = signToken(user);
  return { user, token };
}

function getUserById(id) {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  return sanitizeUser(row);
}

// --- Express Middlewares ---
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.slice(7).trim();
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: err.message || "Invalid or expired token" });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden. Requires one of: ${allowedRoles.join(", ")}` });
    }
    next();
  };
}

module.exports = {
  hashPassword,
  generateSalt,
  signToken,
  verifyToken,
  createUser,
  authenticate,
  getUserById,
  sanitizeUser,
  requireAuth,
  requireRole,
};
