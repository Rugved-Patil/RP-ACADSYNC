const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const { db, fromRow } = require("../db");
const {
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
} = require("../lib/auth");

describe("Authentication & Role Authorization Tests", () => {
  const testEmail = `test.user.${Date.now()}@acadsync.edu`;
  const testPassword = "SecurePassword123!";
  let createdUserId = null;

  after(() => {
    if (createdUserId) {
      db.prepare("DELETE FROM users WHERE id = ?").run(createdUserId);
    }
  });

  it("should securely hash passwords with salt and produce deterministic results for matching salt", () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    assert.notStrictEqual(salt1, salt2);

    const hash1a = hashPassword("secret", salt1);
    const hash1b = hashPassword("secret", salt1);
    const hash2 = hashPassword("secret", salt2);

    assert.strictEqual(hash1a, hash1b);
    assert.notStrictEqual(hash1a, hash2);
  });

  it("should sign and verify valid session tokens (HMAC-SHA256)", () => {
    const payload = { id: "test-user-id", email: "test@institution.edu", role: "teacher" };
    const token = signToken(payload);

    assert.ok(typeof token === "string");
    assert.strictEqual(token.split(".").length, 3);

    const verified = verifyToken(token);
    assert.strictEqual(verified.id, payload.id);
    assert.strictEqual(verified.email, payload.email);
    assert.strictEqual(verified.role, payload.role);
    assert.ok(verified.exp > Math.floor(Date.now() / 1000));
  });

  it("should reject tampered or malformed tokens", () => {
    const token = signToken({ id: "real-id", role: "student" });
    const parts = token.split(".");
    const tampered = `${parts[0]}.${parts[1]}.tamperedsignature`;

    assert.throws(() => verifyToken(tampered), /Invalid token signature/);
    assert.throws(() => verifyToken("invalid-token-string"), /Malformed token/);
    assert.throws(() => verifyToken(""), /Missing token/);
  });

  it("should create a user account and ensure password_hash and salt are sanitized", () => {
    const user = createUser({
      name: "Test Faculty Member",
      email: testEmail,
      password: testPassword,
      role: "teacher",
    });

    createdUserId = user.id;
    assert.ok(user.id);
    assert.strictEqual(user.email, testEmail.toLowerCase());
    assert.strictEqual(user.role, "teacher");
    assert.strictEqual(user.password_hash, undefined);
    assert.strictEqual(user.salt, undefined);

    // Verify row in database actually contains the hash and salt
    const rawRow = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
    assert.ok(rawRow.password_hash);
    assert.ok(rawRow.salt);

    // Verify fromRow sanitizes it
    const fromRowResult = fromRow("users", rawRow);
    assert.strictEqual(fromRowResult.password_hash, undefined);
    assert.strictEqual(fromRowResult.salt, undefined);
  });

  it("should reject duplicate email addresses", () => {
    assert.throws(() => {
      createUser({
        name: "Duplicate User",
        email: testEmail,
        password: "anotherPassword",
        role: "teacher",
      });
    }, /already exists/);
  });

  it("should enforce valid roles", () => {
    assert.throws(() => {
      createUser({
        name: "Hacker User",
        email: `hacker.${Date.now()}@acadsync.edu`,
        password: "password",
        role: "superadmin_invalid",
      });
    }, /role must be/);
  });

  it("should authenticate with correct password and reject wrong password", () => {
    const authResult = authenticate(testEmail, testPassword);
    assert.ok(authResult.token);
    assert.strictEqual(authResult.user.email, testEmail.toLowerCase());
    assert.strictEqual(authResult.user.role, "teacher");

    assert.throws(() => {
      authenticate(testEmail, "WrongPassword");
    }, /Invalid email or password/);

    assert.throws(() => {
      authenticate("nonexistent@acadsync.edu", testPassword);
    }, /Invalid email or password/);
  });

  it("should enforce requireAuth middleware correctly", () => {
    const validToken = signToken({ id: createdUserId, role: "teacher" });

    let nextCalled = false;
    const reqValid = { headers: { authorization: `Bearer ${validToken}` } };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.responseData = data;
        return this;
      },
    };

    requireAuth(reqValid, res, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(reqValid.user.id, createdUserId);

    // Missing token
    nextCalled = false;
    const reqMissing = { headers: {} };
    requireAuth(reqMissing, res, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
  });

  it("should enforce requireRole middleware permissions", () => {
    const adminReq = { user: { id: "1", role: "admin" } };
    const teacherReq = { user: { id: "2", role: "teacher" } };

    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.responseData = data;
        return this;
      },
    };

    let nextCalled = false;
    requireRole("admin")(adminReq, res, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);

    nextCalled = false;
    requireRole("admin")(teacherReq, res, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
  });

  it("should authenticate default college seed accounts (admin, teacher, student)", () => {
    // Admin
    const adminAuth = authenticate("admin@acadsync.edu", "admin123");
    assert.strictEqual(adminAuth.user.role, "admin");
    assert.ok(adminAuth.token);

    // Faculty
    const teacherAuth = authenticate("snpawar@jnec.ac.in", "teacher123");
    assert.strictEqual(teacherAuth.user.role, "teacher");
    assert.ok(teacherAuth.token);

    // Student
    const studentAuth = authenticate("student.seecce@jnec.ac.in", "student123");
    assert.strictEqual(studentAuth.user.role, "student");
    assert.ok(studentAuth.token);
  });
});
