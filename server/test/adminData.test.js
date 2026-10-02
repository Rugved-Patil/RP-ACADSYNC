// adminData.test.js — Tests for Admin Data Management (Kill Switch & Safe Re-seed)

const test = require("node:test");
const assert = require("node:assert/strict");
const { db } = require("../db");
const { killSwitch } = require("../lib/adminData");
const { createUser } = require("../lib/auth");
const { seed } = require("../seed");

test("Admin Data Management: killSwitch & Re-seed", async (t) => {
  // Ensure an admin user exists
  const existingAdmin = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
  let adminId;
  if (!existingAdmin) {
    const created = createUser({
      name: "Admin User",
      email: "testadmin@acadsync.edu",
      password: "adminpassword",
      role: "admin",
    });
    adminId = created.id;
  } else {
    adminId = existingAdmin.id;
  }

  await t.test("killSwitch should safely wipe all timetable and institutional data while preserving admin account", () => {
    const killResult = killSwitch(adminId);
    assert.strictEqual(killResult.success, true);

    // Verify tables are empty
    const counts = {
      timetables: db.prepare("SELECT COUNT(*) as count FROM timetables").get().count,
      lessons: db.prepare("SELECT COUNT(*) as count FROM lessons").get().count,
      classes: db.prepare("SELECT COUNT(*) as count FROM classes").get().count,
      teachers: db.prepare("SELECT COUNT(*) as count FROM teachers").get().count,
      subjects: db.prepare("SELECT COUNT(*) as count FROM subjects").get().count,
      classrooms: db.prepare("SELECT COUNT(*) as count FROM classrooms").get().count,
    };

    assert.strictEqual(counts.timetables, 0);
    assert.strictEqual(counts.lessons, 0);
    assert.strictEqual(counts.classes, 0);
    assert.strictEqual(counts.teachers, 0);
    assert.strictEqual(counts.subjects, 0);
    assert.strictEqual(counts.classrooms, 0);

    // Verify admin account remains
    const adminUser = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
    assert.ok(adminUser, "Admin account should be safely preserved");
  });

  await t.test("seed should cleanly populate authentic college dataset after killSwitch", () => {
    const seedResult = seed();
    assert.ok(seedResult);
    assert.strictEqual(seedResult.hardViolations, 0);

    const counts = {
      years: db.prepare("SELECT COUNT(*) as count FROM years").get().count,
      classes: db.prepare("SELECT COUNT(*) as count FROM classes").get().count,
      classrooms: db.prepare("SELECT COUNT(*) as count FROM classrooms").get().count,
      teachers: db.prepare("SELECT COUNT(*) as count FROM teachers").get().count,
      subjects: db.prepare("SELECT COUNT(*) as count FROM subjects").get().count,
      timetables: db.prepare("SELECT COUNT(*) as count FROM timetables").get().count,
      lessons: db.prepare("SELECT COUNT(*) as count FROM lessons").get().count,
    };

    assert.strictEqual(counts.years, 4);
    assert.strictEqual(counts.classes, 6);
    assert.strictEqual(counts.classrooms, 16);
    assert.strictEqual(counts.teachers, 19);
    assert.strictEqual(counts.subjects, 63);
    assert.ok(counts.timetables >= 1);
    assert.ok(counts.lessons > 0);
  });
});
