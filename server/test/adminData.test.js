// adminData.test.js — Tests for Admin Data Management (Merge Sample Data & Kill Switch)

const test = require("node:test");
const assert = require("node:assert/strict");
const { db } = require("../db");
const { mergeSampleData, killSwitch } = require("../lib/adminData");
const { createUser } = require("../lib/auth");
const { seed } = require("../seed");

test("Admin Data Management: mergeSampleData & killSwitch", async (t) => {
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

  await t.test("mergeSampleData should add new classes, faculty, subjects, and classrooms", () => {
    const result = mergeSampleData();
    assert.strictEqual(result.success, true);
    assert.ok(result.stats);
    assert.ok(typeof result.stats.addedClasses === "number");

    // Check that added classes exist in the database
    const teClass = db.prepare("SELECT * FROM classes WHERE name = 'TE-CS-A'").get();
    assert.ok(teClass, "TE-CS-A class should be present");

    const beClass = db.prepare("SELECT * FROM classes WHERE name = 'BE-CS-A'").get();
    assert.ok(beClass, "BE-CS-A class should be present");

    // Check that added classrooms exist
    const room = db.prepare("SELECT * FROM classrooms WHERE name = 'LH-301'").get();
    assert.ok(room, "LH-301 classroom should be present");

    // Check that added subjects exist
    const subj = db.prepare("SELECT * FROM subjects WHERE code = 'CS401'").get();
    assert.ok(subj, "CS401 subject should be present");

    // Check that added teacher exists
    const teacher = db.prepare("SELECT * FROM teachers WHERE email = 'sunita.rao@institution.edu'").get();
    assert.ok(teacher, "Dr. Sunita Rao should be present");

    // Check that teacher login account was created
    const teacherUser = db.prepare("SELECT * FROM users WHERE email = 'sunita.rao@institution.edu'").get();
    assert.ok(teacherUser, "Teacher user account should be present");
    assert.strictEqual(teacherUser.role, "teacher");
  });

  await t.test("mergeSampleData should be idempotent and not create duplicate records on repeated calls", () => {
    const classesCountBefore = db.prepare("SELECT COUNT(*) as count FROM classes").get().count;
    const subjectsCountBefore = db.prepare("SELECT COUNT(*) as count FROM subjects").get().count;
    const teachersCountBefore = db.prepare("SELECT COUNT(*) as count FROM teachers").get().count;

    const secondResult = mergeSampleData();
    assert.strictEqual(secondResult.success, true);
    assert.strictEqual(secondResult.stats.addedClasses, 0, "No duplicate classes should be added");
    assert.strictEqual(secondResult.stats.addedSubjects, 0, "No duplicate subjects should be added");
    assert.strictEqual(secondResult.stats.addedTeachers, 0, "No duplicate teachers should be added");

    const classesCountAfter = db.prepare("SELECT COUNT(*) as count FROM classes").get().count;
    const subjectsCountAfter = db.prepare("SELECT COUNT(*) as count FROM subjects").get().count;
    const teachersCountAfter = db.prepare("SELECT COUNT(*) as count FROM teachers").get().count;

    assert.strictEqual(classesCountAfter, classesCountBefore);
    assert.strictEqual(subjectsCountAfter, subjectsCountBefore);
    assert.strictEqual(teachersCountAfter, teachersCountBefore);
  });

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

    // Verify admin account is preserved
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
    assert.ok(adminCount >= 1, "At least one admin user must be preserved");

    // Non-admin users must be wiped
    const nonAdminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role != 'admin'").get().count;
    assert.strictEqual(nonAdminCount, 0, "All non-admin users must be wiped");
  });

  await t.test("mergeSampleData should work cleanly after killSwitch to re-seed institutional records", () => {
    const reseedResult = mergeSampleData();
    assert.strictEqual(reseedResult.success, true);
    assert.ok(reseedResult.stats.addedClasses > 0);
    assert.ok(reseedResult.stats.addedTeachers > 0);
    assert.ok(reseedResult.stats.addedSubjects > 0);
    assert.ok(reseedResult.stats.addedClassrooms > 0);

    const classesCount = db.prepare("SELECT COUNT(*) as count FROM classes").get().count;
    assert.strictEqual(classesCount, 4);
  });

  // Restore baseline realistic seed data so remaining tests and app run on complete dataset
  seed();
});
