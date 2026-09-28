// adminData.js — Administration data management features:
// 1. mergeSampleData(): Seamlessly merges additional sample institutional data
//    (years, classes, teachers, subjects, classrooms, assignments, and logins)
//    without overwriting or duplicating existing data.
// 2. killSwitch(): Safely wipes all timetables, lessons, change requests,
//    assignments, classes, teachers, subjects, timings, and classrooms,
//    preserving the active admin user account.

const { randomUUID } = require("node:crypto");
const { db } = require("../db");
const { createUser } = require("./auth");

/**
 * Merges additional sample institutional data into the SQLite database.
 * Idempotent: checks for existing names/codes/emails to avoid duplicates.
 */
function mergeSampleData() {
  const now = new Date().toISOString();
  let addedYears = 0;
  let addedClasses = 0;
  let addedClassrooms = 0;
  let addedTeachers = 0;
  let addedSubjects = 0;
  let addedAssignments = 0;
  let addedUsers = 0;

  return db.transaction(() => {
    // 1. Academic Years (TE and BE if not already present)
    const targetYears = [
      { name: "Third Year (TE)" },
      { name: "Final Year (BE)" },
    ];

    const yearMap = new Map();
    for (const y of targetYears) {
      const existing = db.prepare("SELECT id FROM years WHERE name = ?").get(y.name);
      if (existing) {
        yearMap.set(y.name, existing.id);
      } else {
        const id = randomUUID();
        db.prepare(
          "INSERT INTO years (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)"
        ).run(id, y.name, now, now);
        yearMap.set(y.name, id);
        addedYears++;
      }
    }

    // 2. Classes
    const targetClasses = [
      { name: "TE-CS-A", yearName: "Third Year (TE)", capacity: 60, student_count: 56 },
      { name: "TE-CS-B", yearName: "Third Year (TE)", capacity: 60, student_count: 54 },
      { name: "BE-CS-A", yearName: "Final Year (BE)", capacity: 60, student_count: 58 },
      { name: "BE-CS-B", yearName: "Final Year (BE)", capacity: 60, student_count: 57 },
    ];

    const classMap = new Map();
    for (const c of targetClasses) {
      const existing = db.prepare("SELECT id FROM classes WHERE name = ?").get(c.name);
      if (existing) {
        classMap.set(c.name, existing.id);
      } else {
        const id = randomUUID();
        const yearId = yearMap.get(c.yearName);
        db.prepare(
          "INSERT INTO classes (id, name, year_id, capacity, student_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(id, c.name, yearId, c.capacity, c.student_count, now, now);
        classMap.set(c.name, id);
        addedClasses++;
      }
    }

    // 3. Classrooms
    const targetClassrooms = [
      {
        name: "LH-301",
        capacity: 70,
        is_lab: 0,
        location: "Block B, 1st Floor",
        equipment: "Projector, AC, Smart Board",
      },
      {
        name: "LH-302",
        capacity: 70,
        is_lab: 0,
        location: "Block B, 1st Floor",
        equipment: "Projector, AC",
      },
      {
        name: "Lab 3 - Cloud Computing & AI Lab",
        capacity: 40,
        is_lab: 1,
        location: "CS Block, 3rd Floor",
        equipment: "40 GPU Workstations, Cloud Server Rack, Gigabit LAN",
      },
      {
        name: "Seminar Hall B",
        capacity: 120,
        is_lab: 0,
        location: "Block B, Ground Floor",
        equipment: "Surround Sound, Dual 4K Projectors, Smart Podium",
      },
    ];

    const classroomMap = new Map();
    for (const r of targetClassrooms) {
      const existing = db.prepare("SELECT id FROM classrooms WHERE name = ?").get(r.name);
      if (existing) {
        classroomMap.set(r.name, existing.id);
      } else {
        const id = randomUUID();
        db.prepare(
          "INSERT INTO classrooms (id, name, capacity, is_lab, location, equipment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(id, r.name, r.capacity, r.is_lab, r.location, r.equipment, now, now);
        classroomMap.set(r.name, id);
        addedClassrooms++;
      }
    }

    // 4. Default Class-Classroom Assignments
    const targetClassRoomAssignments = [
      { className: "TE-CS-A", roomName: "LH-301" },
      { className: "TE-CS-B", roomName: "LH-302" },
      { className: "BE-CS-A", roomName: "Seminar Hall B" },
      { className: "BE-CS-B", roomName: "LH-301" },
    ];
    for (const cra of targetClassRoomAssignments) {
      const classId = classMap.get(cra.className);
      const roomId = classroomMap.get(cra.roomName);
      if (classId && roomId) {
        const existing = db
          .prepare(
            "SELECT id FROM class_classroom_assignments WHERE class_id = ? AND classroom_id = ?"
          )
          .get(classId, roomId);
        if (!existing) {
          db.prepare(
            "INSERT INTO class_classroom_assignments (id, class_id, classroom_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
          ).run(randomUUID(), classId, roomId, now, now);
          addedAssignments++;
        }
      }
    }

    // 5. Teachers
    const targetTeachers = [
      {
        name: "Dr. Sunita Rao",
        email: "sunita.rao@institution.edu",
        specialization: "Cloud Computing & Distributed Systems",
        max_periods_per_day: 4,
      },
      {
        name: "Prof. Rohan Patil",
        email: "rohan.patil@institution.edu",
        specialization: "Artificial Intelligence & Deep Learning",
        max_periods_per_day: 4,
      },
      {
        name: "Prof. Neha Gupta",
        email: "neha.gupta@institution.edu",
        specialization: "Compiler Construction & NLP",
        max_periods_per_day: 4,
      },
      {
        name: "Prof. Anand Kadam",
        email: "anand.kadam@institution.edu",
        specialization: "Cybersecurity & Blockchain",
        max_periods_per_day: 4,
      },
    ];

    const teacherMap = new Map();
    for (const t of targetTeachers) {
      const existing = db.prepare("SELECT id FROM teachers WHERE email = ?").get(t.email);
      let teacherId;
      if (existing) {
        teacherId = existing.id;
      } else {
        teacherId = randomUUID();
        db.prepare(
          "INSERT INTO teachers (id, name, email, specialization, max_periods_per_day, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(teacherId, t.name, t.email, t.specialization, t.max_periods_per_day, now, now);
        addedTeachers++;
      }
      teacherMap.set(t.email, teacherId);

      // Provision teacher login user account
      const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(t.email);
      if (!existingUser) {
        createUser({
          name: t.name,
          email: t.email,
          password: "teacher123",
          role: "teacher",
          teacher_id: teacherId,
        });
        addedUsers++;
      }
    }

    // Provision student accounts for new classes
    for (const c of targetClasses) {
      const classId = classMap.get(c.name);
      const classSlug = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const studentEmail = `student.${classSlug}@acadsync.edu`;
      const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(studentEmail);
      if (!existingUser && classId) {
        createUser({
          name: `${c.name} Representative`,
          email: studentEmail,
          password: "student123",
          role: "student",
          class_id: classId,
        });
        addedUsers++;
      }
    }

    // 6. Subjects
    const targetSubjects = [
      {
        name: "Artificial Intelligence",
        code: "CS401",
        periods_per_week: 3,
        is_lab: 0,
        lab_duration_hours: 1,
      },
      {
        name: "AI & Deep Learning Lab",
        code: "CS401L",
        periods_per_week: 2,
        is_lab: 1,
        lab_duration_hours: 2,
      },
      {
        name: "Cloud Computing Architecture",
        code: "CS402",
        periods_per_week: 3,
        is_lab: 0,
        lab_duration_hours: 1,
      },
      {
        name: "Cloud Practicum Lab",
        code: "CS402L",
        periods_per_week: 2,
        is_lab: 1,
        lab_duration_hours: 2,
      },
      {
        name: "Compiler Construction",
        code: "CS501",
        periods_per_week: 3,
        is_lab: 0,
        lab_duration_hours: 1,
      },
      {
        name: "Information & Cyber Security",
        code: "CS502",
        periods_per_week: 3,
        is_lab: 0,
        lab_duration_hours: 1,
      },
    ];

    const subjectMap = new Map();
    for (const s of targetSubjects) {
      const existing = db.prepare("SELECT id FROM subjects WHERE code = ?").get(s.code);
      let subjectId;
      if (existing) {
        subjectId = existing.id;
      } else {
        subjectId = randomUUID();
        db.prepare(
          "INSERT INTO subjects (id, name, code, periods_per_week, is_lab, lab_duration_hours, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(subjectId, s.name, s.code, s.periods_per_week, s.is_lab, s.lab_duration_hours, now, now);
        addedSubjects++;
      }
      subjectMap.set(s.code, subjectId);
    }

    // 7. Teacher-Subject Assignments
    const targetTeacherSubjects = [
      { teacherEmail: "sunita.rao@institution.edu", subjectCode: "CS402" },
      { teacherEmail: "sunita.rao@institution.edu", subjectCode: "CS402L" },
      { teacherEmail: "rohan.patil@institution.edu", subjectCode: "CS401" },
      { teacherEmail: "rohan.patil@institution.edu", subjectCode: "CS401L" },
      { teacherEmail: "neha.gupta@institution.edu", subjectCode: "CS501" },
      { teacherEmail: "neha.gupta@institution.edu", subjectCode: "CS401L" },
      { teacherEmail: "anand.kadam@institution.edu", subjectCode: "CS502" },
    ];

    for (const ts of targetTeacherSubjects) {
      const tId = teacherMap.get(ts.teacherEmail);
      const sId = subjectMap.get(ts.subjectCode);
      if (tId && sId) {
        const existing = db
          .prepare(
            "SELECT id FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_id = ?"
          )
          .get(tId, sId);
        if (!existing) {
          db.prepare(
            "INSERT INTO teacher_subject_assignments (id, teacher_id, subject_id, created_at) VALUES (?, ?, ?, ?)"
          ).run(randomUUID(), tId, sId, now);
          addedAssignments++;
        }
      }
    }

    // 8. Subject-Class Assignments
    // TE classes get CS401, CS401L, CS402, CS402L
    const teCodes = ["CS401", "CS401L", "CS402", "CS402L"];
    for (const className of ["TE-CS-A", "TE-CS-B"]) {
      const cId = classMap.get(className);
      if (cId) {
        for (const code of teCodes) {
          const sId = subjectMap.get(code);
          if (sId) {
            const existing = db
              .prepare(
                "SELECT id FROM subject_class_assignments WHERE subject_id = ? AND class_id = ?"
              )
              .get(sId, cId);
            if (!existing) {
              db.prepare(
                "INSERT INTO subject_class_assignments (id, subject_id, class_id, created_at) VALUES (?, ?, ?, ?)"
              ).run(randomUUID(), sId, cId, now);
              addedAssignments++;
            }
          }
        }
      }
    }

    // BE classes get CS501, CS502
    const beCodes = ["CS501", "CS502"];
    for (const className of ["BE-CS-A", "BE-CS-B"]) {
      const cId = classMap.get(className);
      if (cId) {
        for (const code of beCodes) {
          const sId = subjectMap.get(code);
          if (sId) {
            const existing = db
              .prepare(
                "SELECT id FROM subject_class_assignments WHERE subject_id = ? AND class_id = ?"
              )
              .get(sId, cId);
            if (!existing) {
              db.prepare(
                "INSERT INTO subject_class_assignments (id, subject_id, class_id, created_at) VALUES (?, ?, ?, ?)"
              ).run(randomUUID(), sId, cId, now);
              addedAssignments++;
            }
          }
        }
      }
    }

    return {
      success: true,
      stats: {
        addedYears,
        addedClasses,
        addedClassrooms,
        addedTeachers,
        addedSubjects,
        addedAssignments,
        addedUsers,
      },
      message: `Successfully merged sample data: ${addedClasses} classes, ${addedTeachers} faculty, ${addedSubjects} subjects, and ${addedClassrooms} classrooms.`,
    };
  })();
}

/**
 * Kill switch: safely wipes all timetable and institutional data while preserving admin account(s).
 */
function killSwitch(currentAdminId) {
  const tablesToClear = [
    "schedule_overrides",
    "change_requests",
    "lessons",
    "timetables",
    "timetable_drafts",
    "subject_class_assignments",
    "teacher_subject_assignments",
    "class_classroom_assignments",
    "time_slots",
    "timings",
    "subjects",
    "classes",
    "years",
    "teachers",
    "classrooms",
  ];

  return db.transaction(() => {
    // 1. Delete all timetable, scheduling, and institutional rows
    for (const table of tablesToClear) {
      db.prepare(`DELETE FROM "${table}"`).run();
    }

    // 2. Clear non-admin users (preserve admin accounts so the user can remain logged in)
    db.prepare("DELETE FROM users WHERE role != 'admin'").run();

    // 3. Ensure at least one admin account exists
    const adminCount = db
      .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
      .get().count;

    if (adminCount === 0) {
      createUser({
        name: "System Administrator",
        email: "admin@acadsync.edu",
        password: "admin123",
        role: "admin",
      });
    }

    return {
      success: true,
      message:
        "All timetables, classes, teachers, subjects, classrooms, and student/faculty records have been permanently wiped. Administrator account preserved.",
    };
  })();
}

module.exports = {
  mergeSampleData,
  killSwitch,
};
