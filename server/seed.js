// seed.js — Realistic sample academic institution data seeder for ACADSYNC.
//
// Implements Section 6.7 of the Scope Document:
// Populates a fresh database with a realistic sample institution (academic years,
// classes, teachers, subjects, classrooms, timings, time slots, assignments, and
// a conflict-free generated timetable) so a demo never starts from an empty screen.
//
// Run with: node server/seed.js (or npm run seed)

const { randomUUID } = require("crypto");
const { db } = require("./db");
const { generateTimetable } = require("./lib/generator");
const { createUser } = require("./lib/auth");

function seed() {
  console.log("🌱 Seeding ACADSYNC database with realistic sample institution data...");

  const now = new Date().toISOString();

  // Clear existing tables in safe order
  const tables = [
    "schedule_overrides",
    "change_requests",
    "users",
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

  db.transaction(() => {
    for (const table of tables) {
      db.prepare(`DELETE FROM "${table}"`).run();
    }
  })();

  // 1. Academic Years
  const years = [
    { id: randomUUID(), name: "First Year (FE)" },
    { id: randomUUID(), name: "Second Year (SE)" },
    { id: randomUUID(), name: "Third Year (TE)" },
  ];

  const insertYear = db.prepare(
    "INSERT INTO years (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)"
  );
  years.forEach((y) => insertYear.run(y.id, y.name, now, now));
  console.log(`✓ Added ${years.length} Academic Years`);

  // 2. Classes
  const classes = [
    { id: randomUUID(), name: "FE-CS-A", year_id: years[0].id, capacity: 60, student_count: 58 },
    { id: randomUUID(), name: "FE-CS-B", year_id: years[0].id, capacity: 60, student_count: 55 },
    { id: randomUUID(), name: "SE-CS-A", year_id: years[1].id, capacity: 60, student_count: 60 },
    { id: randomUUID(), name: "SE-CS-B", year_id: years[1].id, capacity: 60, student_count: 57 },
  ];

  const insertClass = db.prepare(
    "INSERT INTO classes (id, name, year_id, capacity, student_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  classes.forEach((c) => insertClass.run(c.id, c.name, c.year_id, c.capacity, c.student_count, now, now));
  console.log(`✓ Added ${classes.length} Classes`);

  // 3. Classrooms
  const classrooms = [
    { id: randomUUID(), name: "LH-101", capacity: 70, is_lab: 0, location: "Block A, Ground Floor", equipment: "Projector, Audio System, Smart Board" },
    { id: randomUUID(), name: "LH-102", capacity: 70, is_lab: 0, location: "Block A, Ground Floor", equipment: "Projector, Audio System" },
    { id: randomUUID(), name: "LH-201", capacity: 70, is_lab: 0, location: "Block A, 1st Floor", equipment: "Projector, Smart Board" },
    { id: randomUUID(), name: "LH-202", capacity: 70, is_lab: 0, location: "Block A, 1st Floor", equipment: "Projector" },
    { id: randomUUID(), name: "Lab 1 - Systems & Programming", capacity: 35, is_lab: 1, location: "CS Block, 2nd Floor", equipment: "35 High-End Linux Workstations, Gigabit LAN" },
    { id: randomUUID(), name: "Lab 2 - Database & Network Lab", capacity: 35, is_lab: 1, location: "CS Block, 2nd Floor", equipment: "35 Windows Workstations, Cisco Switch Racks" },
  ];

  const insertClassroom = db.prepare(
    "INSERT INTO classrooms (id, name, capacity, is_lab, location, equipment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  classrooms.forEach((r) => insertClassroom.run(r.id, r.name, r.capacity, r.is_lab, r.location, r.equipment, now, now));
  console.log(`✓ Added ${classrooms.length} Classrooms (including 2 Laboratories)`);

  // 4. Default Class-Classroom Assignments
  const insertClassRoom = db.prepare(
    "INSERT INTO class_classroom_assignments (id, class_id, classroom_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  );
  insertClassRoom.run(randomUUID(), classes[0].id, classrooms[0].id, now, now);
  insertClassRoom.run(randomUUID(), classes[1].id, classrooms[1].id, now, now);
  insertClassRoom.run(randomUUID(), classes[2].id, classrooms[2].id, now, now);
  insertClassRoom.run(randomUUID(), classes[3].id, classrooms[3].id, now, now);

  // 5. Teachers
  const teachers = [
    { id: randomUUID(), name: "Dr. A. R. Sharma", email: "ar.sharma@institution.edu", specialization: "Data Structures & Algorithms", max_periods_per_day: 4 },
    { id: randomUUID(), name: "Prof. Priya Nair", email: "priya.nair@institution.edu", specialization: "Database Management Systems", max_periods_per_day: 4 },
    { id: randomUUID(), name: "Dr. Rajesh Kulkarni", email: "rajesh.kulkarni@institution.edu", specialization: "Computer Networks & Security", max_periods_per_day: 4 },
    { id: randomUUID(), name: "Prof. Sneha Joshi", email: "sneha.joshi@institution.edu", specialization: "Operating Systems", max_periods_per_day: 4 },
    { id: randomUUID(), name: "Prof. Vikram Deshmukh", email: "vikram.deshmukh@institution.edu", specialization: "Web Technology & Full Stack", max_periods_per_day: 4 },
    { id: randomUUID(), name: "Dr. Meera Iyer", email: "meera.iyer@institution.edu", specialization: "Discrete Mathematics & Graph Theory", max_periods_per_day: 4 },
    { id: randomUUID(), name: "Prof. Amit Verma", email: "amit.verma@institution.edu", specialization: "Object-Oriented Programming (Java/C++)", max_periods_per_day: 4 },
    { id: randomUUID(), name: "Prof. Kavita Rao", email: "kavita.rao@institution.edu", specialization: "Digital Electronics & Architecture", max_periods_per_day: 4 },
  ];

  const insertTeacher = db.prepare(
    "INSERT INTO teachers (id, name, email, specialization, max_periods_per_day, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  teachers.forEach((t) => insertTeacher.run(t.id, t.name, t.email, t.specialization, t.max_periods_per_day, now, now));
  console.log(`✓ Added ${teachers.length} Faculty Members`);

  // 6. Subjects
  const subjects = [
    // First Year Subjects
    { id: randomUUID(), name: "Object Oriented Programming", code: "CS101", periods_per_week: 3, is_lab: 0, lab_duration_hours: 1 },
    { id: randomUUID(), name: "OOP Practical Lab", code: "CS101L", periods_per_week: 2, is_lab: 1, lab_duration_hours: 2 },
    { id: randomUUID(), name: "Digital Electronics", code: "EC101", periods_per_week: 3, is_lab: 0, lab_duration_hours: 1 },
    { id: randomUUID(), name: "Discrete Mathematics", code: "MA201", periods_per_week: 4, is_lab: 0, lab_duration_hours: 1 },
    // Second Year Subjects
    { id: randomUUID(), name: "Data Structures & Algorithms", code: "CS201", periods_per_week: 3, is_lab: 0, lab_duration_hours: 1 },
    { id: randomUUID(), name: "DSA Practical Lab", code: "CS201L", periods_per_week: 2, is_lab: 1, lab_duration_hours: 2 },
    { id: randomUUID(), name: "Database Management Systems", code: "CS202", periods_per_week: 3, is_lab: 0, lab_duration_hours: 1 },
    { id: randomUUID(), name: "DBMS Practical Lab", code: "CS202L", periods_per_week: 2, is_lab: 1, lab_duration_hours: 2 },
    { id: randomUUID(), name: "Computer Networks", code: "CS301", periods_per_week: 3, is_lab: 0, lab_duration_hours: 1 },
    { id: randomUUID(), name: "Operating Systems", code: "CS302", periods_per_week: 3, is_lab: 0, lab_duration_hours: 1 },
  ];

  const insertSubject = db.prepare(
    "INSERT INTO subjects (id, name, code, periods_per_week, is_lab, lab_duration_hours, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  subjects.forEach((s) => insertSubject.run(s.id, s.name, s.code, s.periods_per_week, s.is_lab, s.lab_duration_hours, now, now));
  console.log(`✓ Added ${subjects.length} Subjects (Theory & Labs)`);

  // 7. Teacher-Subject Assignments
  const insertTeacherSubject = db.prepare(
    "INSERT INTO teacher_subject_assignments (id, teacher_id, subject_id, created_at) VALUES (?, ?, ?, ?)"
  );
  // CS101, CS101L -> Prof. Amit Verma, Prof. Vikram Deshmukh
  insertTeacherSubject.run(randomUUID(), teachers[6].id, subjects[0].id, now);
  insertTeacherSubject.run(randomUUID(), teachers[6].id, subjects[1].id, now);
  insertTeacherSubject.run(randomUUID(), teachers[4].id, subjects[0].id, now);
  insertTeacherSubject.run(randomUUID(), teachers[4].id, subjects[1].id, now);

  // EC101 -> Prof. Kavita Rao
  insertTeacherSubject.run(randomUUID(), teachers[7].id, subjects[2].id, now);

  // MA201 -> Dr. Meera Iyer
  insertTeacherSubject.run(randomUUID(), teachers[5].id, subjects[3].id, now);

  // CS201, CS201L -> Dr. A. R. Sharma, Prof. Amit Verma
  insertTeacherSubject.run(randomUUID(), teachers[0].id, subjects[4].id, now);
  insertTeacherSubject.run(randomUUID(), teachers[0].id, subjects[5].id, now);
  insertTeacherSubject.run(randomUUID(), teachers[6].id, subjects[4].id, now);
  insertTeacherSubject.run(randomUUID(), teachers[6].id, subjects[5].id, now);

  // CS202, CS202L -> Prof. Priya Nair, Prof. Vikram Deshmukh
  insertTeacherSubject.run(randomUUID(), teachers[1].id, subjects[6].id, now);
  insertTeacherSubject.run(randomUUID(), teachers[1].id, subjects[7].id, now);
  insertTeacherSubject.run(randomUUID(), teachers[4].id, subjects[6].id, now);
  insertTeacherSubject.run(randomUUID(), teachers[4].id, subjects[7].id, now);

  // CS301 -> Dr. Rajesh Kulkarni
  insertTeacherSubject.run(randomUUID(), teachers[2].id, subjects[8].id, now);

  // CS302 -> Prof. Sneha Joshi
  insertTeacherSubject.run(randomUUID(), teachers[3].id, subjects[9].id, now);
  console.log("✓ Assigned Teachers to Subjects");

  // 8. Subject-Class Assignments
  const insertSubjClass = db.prepare(
    "INSERT INTO subject_class_assignments (id, subject_id, class_id, created_at) VALUES (?, ?, ?, ?)"
  );
  // FE classes get FE subjects (0, 1, 2, 3)
  for (const c of [classes[0], classes[1]]) {
    for (let i = 0; i < 4; i++) {
      insertSubjClass.run(randomUUID(), subjects[i].id, c.id, now);
    }
  }
  // SE classes get SE subjects (4, 5, 6, 7, 8, 9)
  for (const c of [classes[2], classes[3]]) {
    for (let i = 4; i < 10; i++) {
      insertSubjClass.run(randomUUID(), subjects[i].id, c.id, now);
    }
  }
  console.log("✓ Assigned Subjects to Classes");

  // 9. Timings and Time Slots
  const timingId = randomUUID();
  const periodsConfig = [
    { start_time: "09:00", end_time: "10:00", is_break: 0, slot_order: 1 },
    { start_time: "10:00", end_time: "11:00", is_break: 0, slot_order: 2 },
    { start_time: "11:00", end_time: "11:15", is_break: 1, slot_order: 3 }, // Recess
    { start_time: "11:15", end_time: "12:15", is_break: 0, slot_order: 4 },
    { start_time: "12:15", end_time: "13:15", is_break: 0, slot_order: 5 },
    { start_time: "13:15", end_time: "14:00", is_break: 1, slot_order: 6 }, // Lunch
    { start_time: "14:00", end_time: "15:00", is_break: 0, slot_order: 7 },
    { start_time: "15:00", end_time: "16:00", is_break: 0, slot_order: 8 },
  ];

  db.prepare(
    "INSERT INTO timings (id, name, working_days, periods, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    timingId,
    "Standard Academic Schedule (Mon-Sat)",
    JSON.stringify([0, 1, 2, 3, 4, 5]),
    JSON.stringify(periodsConfig),
    now,
    now
  );

  const insertTimeSlot = db.prepare(
    "INSERT INTO time_slots (id, timing_id, start_time, end_time, is_break, slot_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  periodsConfig.forEach((p) => {
    insertTimeSlot.run(randomUUID(), timingId, p.start_time, p.end_time, p.is_break, p.slot_order, now, now);
  });
  console.log(`✓ Added Timings configuration with ${periodsConfig.length} time slots (including breaks)`);

  // 10. Generate an initial conflict-free Timetable using the Genetic Algorithm!
  console.log("🧬 Generating conflict-free baseline timetable using Genetic Algorithm...");
  const generated = generateTimetable({
    name: "Academic Year 2026-27 Master Schedule",
    academicYear: "2026-2027",
    timingId,
    popSize: 50,
    maxGenerations: 100,
  });

  // 11. User Accounts (v2.0.0 Section 7.1 & 7.2)
  console.log("🔐 Provisioning user accounts for Admin, Teachers, and Students...");
  // Admin Account
  createUser({
    name: "System Administrator",
    email: "admin@acadsync.edu",
    password: "admin123",
    role: "admin",
  });

  // Teacher Accounts
  teachers.forEach((t) => {
    createUser({
      name: t.name,
      email: t.email,
      password: "teacher123",
      role: "teacher",
      teacher_id: t.id,
    });
  });

  // Student Accounts (one per class)
  classes.forEach((c) => {
    const classSlug = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    createUser({
      name: `${c.name} Representative`,
      email: `student.${classSlug}@acadsync.edu`,
      password: "student123",
      role: "student",
      class_id: c.id,
    });
  });
  console.log(`✓ Created 1 Admin, ${teachers.length} Teacher, and ${classes.length} Student accounts`);

  console.log("\n🎉 ACADSYNC database seeding complete. Start the app with `npm run dev`!");
}

seed();
