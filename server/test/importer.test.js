const { describe, it } = require("node:test");
const assert = require("node:assert");
const { db } = require("../db");
const { importData } = require("../lib/importer");

describe("Bulk CSV & Data Import Tests", () => {
  it("should import classes from CSV with automatic year creation", () => {
    const csvContent = `Class Name,Year,Student Count
Test-Import-Class-A,Import Year 1,45
Test-Import-Class-B,Import Year 1,50`;

    const base64 = Buffer.from(csvContent).toString("base64");
    const res = importData({
      file: base64,
      fileName: "classes.csv",
      dataType: "classes",
      mimeType: "text/csv",
    });

    assert.ok(res.success);
    assert.strictEqual(res.rowsProcessed, 2);

    const clsA = db.prepare("SELECT * FROM classes WHERE name = ?").get("Test-Import-Class-A");
    assert.ok(clsA, "Class A should be in database");
    assert.strictEqual(clsA.student_count, 45);

    const year = db.prepare("SELECT * FROM years WHERE name = ?").get("Import Year 1");
    assert.ok(year, "Year should be automatically created");
    assert.strictEqual(clsA.year_id, year.id);

    // Cleanup
    db.prepare("DELETE FROM classes WHERE name IN ('Test-Import-Class-A', 'Test-Import-Class-B')").run();
    db.prepare("DELETE FROM years WHERE name = 'Import Year 1'").run();
  });

  it("should import classrooms from CSV with lab flag detection", () => {
    const csvContent = `Classroom Name,Capacity,Is Lab,Location
Test-LH-99,80,No,East Wing
Test-Lab-99,40,Yes Lab,West Wing`;

    const base64 = Buffer.from(csvContent).toString("base64");
    const res = importData({
      file: base64,
      fileName: "classrooms.csv",
      dataType: "classrooms",
      mimeType: "text/csv",
    });

    assert.ok(res.success);
    assert.strictEqual(res.rowsProcessed, 2);

    const lh = db.prepare("SELECT * FROM classrooms WHERE name = ?").get("Test-LH-99");
    assert.ok(lh);
    assert.strictEqual(lh.is_lab, 0);

    const lab = db.prepare("SELECT * FROM classrooms WHERE name = ?").get("Test-Lab-99");
    assert.ok(lab);
    assert.strictEqual(lab.is_lab, 1);

    // Cleanup
    db.prepare("DELETE FROM classrooms WHERE name IN ('Test-LH-99', 'Test-Lab-99')").run();
  });

  it("should import subjects from CSV and assign them to existing classes", () => {
    const testClassId = `test-c-${Date.now()}`;
    const testClassName = `Test-Target-Class-${Date.now()}`;
    const now = new Date().toISOString();
    db.prepare("INSERT INTO classes (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(testClassId, testClassName, now, now);

    const codeA = `CS999-${Date.now()}`;
    const codeB = `CS999L-${Date.now()}`;

    const csvContent = `Subject Name,Subject Code,Periods per Week,Is Lab,Classes
Cloud Computing,${codeA},4,No,${testClassName}
Cloud Lab,${codeB},2,Yes,${testClassName}`;

    const base64 = Buffer.from(csvContent).toString("base64");
    const res = importData({
      file: base64,
      fileName: "subjects.csv",
      dataType: "subjects",
      mimeType: "text/csv",
    });

    assert.ok(res.success);
    assert.strictEqual(res.rowsProcessed, 2);

    const subj = db.prepare("SELECT * FROM subjects WHERE code = ?").get(codeA);
    assert.ok(subj);
    assert.strictEqual(subj.periods_per_week, 4);
    assert.strictEqual(subj.is_lab, 0);

    const lab = db.prepare("SELECT * FROM subjects WHERE code = ?").get(codeB);
    assert.ok(lab);
    assert.strictEqual(lab.is_lab, 1);

    const assignment = db.prepare("SELECT * FROM subject_class_assignments WHERE subject_id = ?").get(subj.id);
    assert.ok(assignment, "Subject-class assignment should be created automatically");
    assert.strictEqual(assignment.class_id, testClassId);

    // Cleanup
    db.prepare("DELETE FROM subject_class_assignments WHERE subject_id IN (?, ?)").run(subj.id, lab.id);
    db.prepare("DELETE FROM subjects WHERE code IN (?, ?)").run(codeA, codeB);
    db.prepare("DELETE FROM classes WHERE id = ?").run(testClassId);
  });

  it("should reject invalid file formats gracefully", () => {
    assert.throws(
      () => {
        importData({
          file: Buffer.from("dummy").toString("base64"),
          fileName: "document.pdf",
          dataType: "classes",
          mimeType: "application/pdf",
        });
      },
      /PDF import isn't supported/
    );
  });
});
