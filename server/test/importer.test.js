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

  it("should import master CSV with Default_Room, Allowed_Rooms, 1 lab credit, and be idempotent", () => {
    const { exportMasterData } = require("../lib/adminData");
    const unique = Date.now();
    const cName = `Test-Class-${unique}`;
    const rName = `Test-Room-${unique}`;
    const lName = `Test-Lab-${unique}`;
    const tEmail = `teacher.${unique}@acadsync.edu`;
    const tName = `Prof. Test ${unique}`;
    const sCode = `TH${unique}`;
    const lCodeDefault = `LABDEF${unique}`;
    const lCodeCustom = `LABCUST${unique}`;

    function row(arr) {
      return arr.map((v) => (v === undefined || v === null ? "" : String(v).includes(",") ? `"${v}"` : String(v))).join(",");
    }

    const csvContent = [
      row(["Record_Type", "Name", "Code", "Year", "Capacity", "Credits", "Periods_Per_Week", "Is_Lab", "Lab_Duration_Hours", "Email", "Specialization", "Max_Daily_Periods", "Location", "Equipment", "Classes", "Teachers", "Batches", "Default_Room", "Allowed_Rooms"]),
      row(["CLASSROOM", rName, "", "", 70, "", "", "No", "", "", "", "", "Block A", "Projector", "", "", "", "", ""]),
      row(["CLASSROOM", lName, "", "", 35, "", "", "Yes", "", "", "", "", "Block B", "Workstations", "", "", "", "", ""]),
      row(["CLASS", cName, "", `Test Year ${unique}`, 60, "", "", "No", "1", "", "", "", "", "", "", "", "Batch A: 20, Batch B: 20", rName, ""]),
      row(["TEACHER", tName, "", "", "", "", "", "No", "", tEmail, "Computer Science", 4, "", "", "", "", "", "", ""]),
      row(["SUBJECT", `Test Theory ${unique}`, sCode, "", "", 3, 3, "No", 1, "", "", "", "", "", cName, tName, "", "", ""]),
      row(["SUBJECT", `Test Lab Default ${unique}`, lCodeDefault, "", "", "", "", "Yes", "", "", "", "", "", "", cName, tName, "", "", lName]),
      row(["SUBJECT", `Test Lab Custom ${unique}`, lCodeCustom, "", "", 2, 2, "Yes", 2, "", "", "", "", "", cName, tName, "", "", lName]),
    ].join("\n");

    const base64 = Buffer.from(csvContent).toString("base64");

    // 1. Initial Import
    const res1 = importData({
      file: base64,
      fileName: "test_master.csv",
      dataType: "master",
      mimeType: "text/csv",
    });
    assert.ok(res1.success);

    // Verify Default_Room was assigned
    const cls = db.prepare("SELECT id FROM classes WHERE name = ?").get(cName);
    const room = db.prepare("SELECT id FROM classrooms WHERE name = ?").get(rName);
    assert.ok(cls && room);
    const classRoomAssign = db.prepare("SELECT * FROM class_classroom_assignments WHERE class_id = ?").get(cls.id);
    assert.ok(classRoomAssign, "Class should have default classroom assignment");
    assert.strictEqual(classRoomAssign.classroom_id, room.id);

    // Verify Teacher max_periods_per_day
    const teacher = db.prepare("SELECT * FROM teachers WHERE email = ?").get(tEmail);
    assert.ok(teacher);
    assert.strictEqual(teacher.max_periods_per_day, 4);

    // Verify Lab credits: Case A (omitted credits defaults to 1 credit, 1 period/week)
    const labDefault = db.prepare("SELECT * FROM subjects WHERE code = ?").get(lCodeDefault);
    assert.ok(labDefault);
    assert.strictEqual(labDefault.credits, 1, "Unspecified lab credits must default to 1");
    assert.strictEqual(labDefault.periods_per_week, 1, "Unspecified lab periods must default to 1");
    assert.strictEqual(labDefault.is_lab, 1);
    assert.strictEqual(labDefault.lab_duration_hours, 2);

    // Verify Lab credits: Case B (custom credits = 2 retained, 2 periods/week)
    const labCustom = db.prepare("SELECT * FROM subjects WHERE code = ?").get(lCodeCustom);
    assert.ok(labCustom);
    assert.strictEqual(labCustom.credits, 2, "Custom lab credits must be preserved");
    assert.strictEqual(labCustom.periods_per_week, 2, "Custom lab periods must match credits (2)");
    assert.strictEqual(labCustom.is_lab, 1);
    assert.strictEqual(labCustom.lab_duration_hours, 2);

    // Verify Allowed_Rooms mapped in subject_classroom_assignments
    const labRoom = db.prepare("SELECT id FROM classrooms WHERE name = ?").get(lName);
    assert.ok(labRoom);
    const labRoomAssign = db
      .prepare("SELECT * FROM subject_classroom_assignments WHERE subject_id = ? AND classroom_id = ?")
      .get(labDefault.id, labRoom.id);
    assert.ok(labRoomAssign, "Lab subject should have subject_classroom_assignments record");

    // 2. Idempotency Check (re-importing the same CSV must NOT duplicate rows)
    const countClassesBefore = db.prepare("SELECT COUNT(*) as count FROM classes WHERE name = ?").get(cName).count;
    const countRoomsBefore = db.prepare("SELECT COUNT(*) as count FROM classrooms WHERE name IN (?, ?)").get(rName, lName).count;
    const countTeachersBefore = db.prepare("SELECT COUNT(*) as count FROM teachers WHERE email = ?").get(tEmail).count;
    const countSubjectsBefore = db.prepare("SELECT COUNT(*) as count FROM subjects WHERE code IN (?, ?, ?)").get(sCode, lCodeDefault, lCodeCustom).count;

    const res2 = importData({
      file: base64,
      fileName: "test_master.csv",
      dataType: "master",
      mimeType: "text/csv",
    });
    assert.ok(res2.success);

    const countClassesAfter = db.prepare("SELECT COUNT(*) as count FROM classes WHERE name = ?").get(cName).count;
    const countRoomsAfter = db.prepare("SELECT COUNT(*) as count FROM classrooms WHERE name IN (?, ?)").get(rName, lName).count;
    const countTeachersAfter = db.prepare("SELECT COUNT(*) as count FROM teachers WHERE email = ?").get(tEmail).count;
    const countSubjectsAfter = db.prepare("SELECT COUNT(*) as count FROM subjects WHERE code IN (?, ?, ?)").get(sCode, lCodeDefault, lCodeCustom).count;

    assert.strictEqual(countClassesAfter, countClassesBefore, "Classes count should not increase on re-import");
    assert.strictEqual(countRoomsAfter, countRoomsBefore, "Rooms count should not increase on re-import");
    assert.strictEqual(countTeachersAfter, countTeachersBefore, "Teachers count should not increase on re-import");
    assert.strictEqual(countSubjectsAfter, countSubjectsBefore, "Subjects count should not increase on re-import");

    // 3. Export roundtrip check
    const exportedCSV = exportMasterData();
    assert.ok(exportedCSV.includes("Default_Room"), "Exported CSV must contain Default_Room header");
    assert.ok(exportedCSV.includes("Allowed_Rooms"), "Exported CSV must contain Allowed_Rooms header");
    assert.ok(exportedCSV.includes(cName), "Exported CSV must contain test class");
    assert.ok(exportedCSV.includes(rName), "Exported CSV must contain test room");

    // Cleanup
    db.prepare("DELETE FROM users WHERE email IN (?, ?)").run(tEmail, `student.${cName.toLowerCase().replace(/[^a-z0-9]/g, "")}@jnec.ac.in`);
    db.prepare("DELETE FROM subject_classroom_assignments WHERE subject_id IN (?, ?, ?)").run(labDefault.id, labCustom.id, sCode);
    db.prepare("DELETE FROM class_classroom_assignments WHERE class_id = ?").run(cls.id);
    db.prepare("DELETE FROM teacher_subject_assignments WHERE teacher_id = ?").run(teacher.id);
    db.prepare("DELETE FROM subject_class_assignments WHERE class_id = ?").run(cls.id);
    db.prepare("DELETE FROM subjects WHERE code IN (?, ?, ?)").run(sCode, lCodeDefault, lCodeCustom);
    db.prepare("DELETE FROM teachers WHERE id = ?").run(teacher.id);
    db.prepare("DELETE FROM classes WHERE id = ?").run(cls.id);
    db.prepare("DELETE FROM classrooms WHERE id IN (?, ?)").run(room.id, labRoom.id);
    db.prepare("DELETE FROM years WHERE name = ?").run(`Test Year ${unique}`);
  });
});
