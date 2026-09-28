const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const { randomUUID } = require("crypto");
const { db, fromRow, toRow, TABLES } = require("../db");

describe("CRUD & Database Persistence Tests", () => {
  const testYearId = `test-year-${randomUUID()}`;
  const testClassId = `test-class-${randomUUID()}`;
  const testSubjectId = `test-subject-${randomUUID()}`;

  it("should have all required tables created in SQLite", () => {
    const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = rows.map((r) => r.name);
    const expected = [
      "years",
      "classes",
      "subjects",
      "teachers",
      "classrooms",
      "timings",
      "time_slots",
      "subject_class_assignments",
      "teacher_subject_assignments",
      "class_classroom_assignments",
      "timetables",
      "lessons",
      "timetable_drafts",
    ];

    for (const exp of expected) {
      assert.ok(tableNames.includes(exp), `Expected table ${exp} to exist in database`);
    }
  });

  it("should insert, query, and update a year record", () => {
    const now = new Date().toISOString();
    db.prepare("INSERT INTO years (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(
      testYearId,
      "Test Academic Year",
      now,
      now
    );

    const queried = db.prepare("SELECT * FROM years WHERE id = ?").get(testYearId);
    assert.ok(queried);
    assert.strictEqual(queried.name, "Test Academic Year");

    db.prepare("UPDATE years SET name = ? WHERE id = ?").run("Updated Academic Year", testYearId);
    const updated = db.prepare("SELECT * FROM years WHERE id = ?").get(testYearId);
    assert.strictEqual(updated.name, "Updated Academic Year");
  });

  it("should enforce foreign key relationships", () => {
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO classes (id, name, year_id, capacity, student_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(testClassId, "Test Class FK", testYearId, 50, 45, now, now);

    const cls = db.prepare("SELECT * FROM classes WHERE id = ?").get(testClassId);
    assert.ok(cls);
    assert.strictEqual(cls.year_id, testYearId);
  });

  it("should properly serialize and deserialize boolean and JSON columns", () => {
    const rawSubject = {
      id: testSubjectId,
      name: "Test Subject With Boolean",
      code: `TS-${randomUUID().substring(0, 6)}`,
      periods_per_week: 3,
      is_lab: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const dbRow = toRow("subjects", rawSubject);
    assert.strictEqual(dbRow.is_lab, 1, "is_lab boolean should convert to 1 for SQLite");

    db.prepare(
      "INSERT INTO subjects (id, name, code, periods_per_week, is_lab, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(dbRow.id, dbRow.name, dbRow.code, dbRow.periods_per_week, dbRow.is_lab, dbRow.created_at, dbRow.updated_at);

    const retrievedRow = db.prepare("SELECT * FROM subjects WHERE id = ?").get(testSubjectId);
    const parsed = fromRow("subjects", retrievedRow);
    assert.strictEqual(parsed.is_lab, true, "is_lab 1 should convert back to boolean true");
  });

  it("should rollback atomic transactions on error", () => {
    const testRollbackId = `test-rollback-${randomUUID()}`;
    const insertFailTx = db.transaction(() => {
      db.prepare("INSERT INTO years (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(
        testRollbackId,
        "Will Rollback",
        new Date().toISOString(),
        new Date().toISOString()
      );
      throw new Error("Intentional Rollback Trigger");
    });

    assert.throws(() => insertFailTx(), /Intentional Rollback Trigger/);

    const check = db.prepare("SELECT * FROM years WHERE id = ?").get(testRollbackId);
    assert.strictEqual(check, undefined, "Transaction should have rolled back the inserted year");
  });

  after(() => {
    // Clean up test records
    db.prepare("DELETE FROM classes WHERE id = ?").run(testClassId);
    db.prepare("DELETE FROM years WHERE id = ?").run(testYearId);
    db.prepare("DELETE FROM subjects WHERE id = ?").run(testSubjectId);
  });
});
