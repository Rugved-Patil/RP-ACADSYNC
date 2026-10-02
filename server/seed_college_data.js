// seed_college_data.js — Seeds ACADSYNC with the real JNEC (MGM University) ECT & AI-DS Department dataset.
//
// Preserves:
// 1. Existing Timings & Time Slots configuration (exact 10:00 - 17:00 schedule with recesses)
// 2. Admin User Account (admin@acadsync.edu)
//
// Populates:
// 1. 4 Academic Years: First Year (FY), Second Year (SE), Third Year (TY), Final Year (B.Tech)
// 2. 6 Classes: SE-ECCE, SE-AIDS, TY-ECCE, TY-AIDS, B.Tech-ECCE, B.Tech-AIDS
// 3. 16 Classrooms: 7 Lecture Halls (SF-31, SF-32, SF-33, TF-31, TF-32, FF-22, Jack Kilby Hall)
//    and 9 Laboratories with is_lab=1
// 4. Default Class-Classroom assignments (each class to its own lecture hall)
// 5. 19 Faculty members from JNEC ECT / AI-DS
// 6. Complete Curricula: Theory subjects (2-3 hrs/wk) & 2-hour practical lab blocks (is_lab=1, lab_duration_hours=2)
// 7. Teacher-Subject and Subject-Class assignments
// 8. User accounts for all Faculty (teacher123) and Class Representatives (student123)
// 9. Conflict-free master timetable generated via Genetic Algorithm (GA)

const { randomUUID } = require("crypto");
const { db } = require("./db");
const { generateTimetable } = require("./lib/generator");
const { createUser } = require("./lib/auth");

function seedCollegeData() {
  console.log("🏫 Seeding ACADSYNC with JNEC (MGM University) ECT & AI-DS Department data...\n");

  const now = new Date().toISOString();

  // 0. Locate and preserve timing configuration
  const timing = db.prepare("SELECT * FROM timings ORDER BY created_at ASC LIMIT 1").get();
  if (!timing) {
    throw new Error("No timing configuration found in database! Please ensure timing slots exist.");
  }
  console.log(`✓ Preserving Timing Configuration: "${timing.name}" (ID: ${timing.id})`);

  const timeSlots = db.prepare("SELECT * FROM time_slots WHERE timing_id = ? ORDER BY slot_order ASC").all(timing.id);
  const teachingSlots = timeSlots.filter((s) => !s.is_break);
  const breakSlots = timeSlots.filter((s) => !!s.is_break);
  console.log(`✓ Active Schedule: ${teachingSlots.length} teaching periods, ${breakSlots.length} recess breaks`);

  // 1. Wipe non-timing tables in safe dependency order
  const tablesToClear = [
    "schedule_overrides",
    "change_requests",
    "lessons",
    "timetables",
    "timetable_drafts",
    "subject_class_assignments",
    "teacher_subject_assignments",
    "class_classroom_assignments",
    "subjects",
    "classes",
    "years",
    "teachers",
    "classrooms",
  ];

  db.transaction(() => {
    for (const table of tablesToClear) {
      db.prepare(`DELETE FROM "${table}"`).run();
    }
    // Remove non-admin users (preserve admin account)
    db.prepare("DELETE FROM users WHERE role != 'admin'").run();
  })();
  console.log("✓ Cleared prior mock data (timings, time slots, and admin account safely preserved)");

  // Ensure admin account exists
  const existingAdmin = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get();
  if (!existingAdmin) {
    createUser({
      name: "System Administrator",
      email: "admin@acadsync.edu",
      password: "admin123",
      role: "admin",
    });
    console.log("✓ Created default System Administrator (admin@acadsync.edu)");
  } else {
    console.log(`✓ Preserved existing System Administrator (${existingAdmin.email})`);
  }

  // 2. Academic Years
  const yearData = [
    { id: randomUUID(), name: "First Year (FY)" },
    { id: randomUUID(), name: "Second Year (SE)" },
    { id: randomUUID(), name: "Third Year (TY)" },
    { id: randomUUID(), name: "Final Year (B.Tech)" },
  ];
  const yearMap = new Map();
  const insertYear = db.prepare("INSERT INTO years (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)");
  yearData.forEach((y) => {
    insertYear.run(y.id, y.name, now, now);
    yearMap.set(y.name, y.id);
  });
  console.log(`✓ Added ${yearData.length} Academic Years (FY, SE, TY, B.Tech)`);

  // 3. Classes
  const classData = [
    { id: randomUUID(), name: "SE-ECCE", year_id: yearMap.get("Second Year (SE)"), capacity: 60, student_count: 58 },
    { id: randomUUID(), name: "SE-AIDS", year_id: yearMap.get("Second Year (SE)"), capacity: 60, student_count: 55 },
    { id: randomUUID(), name: "TY-ECCE", year_id: yearMap.get("Third Year (TY)"), capacity: 60, student_count: 56 },
    { id: randomUUID(), name: "TY-AIDS", year_id: yearMap.get("Third Year (TY)"), capacity: 60, student_count: 54 },
    { id: randomUUID(), name: "B.Tech-ECCE", year_id: yearMap.get("Final Year (B.Tech)"), capacity: 60, student_count: 57 },
    { id: randomUUID(), name: "B.Tech-AIDS", year_id: yearMap.get("Final Year (B.Tech)"), capacity: 60, student_count: 56 },
  ];
  const classMap = new Map();
  const insertClass = db.prepare(
    "INSERT INTO classes (id, name, year_id, capacity, student_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  classData.forEach((c) => {
    insertClass.run(c.id, c.name, c.year_id, c.capacity, c.student_count, now, now);
    classMap.set(c.name, c.id);
  });
  console.log(`✓ Added ${classData.length} Undergraduate Classes`);

  // 4. Classrooms & Specialized Laboratories
  const roomData = [
    // Lecture Halls (7)
    { id: randomUUID(), name: "SF-31", capacity: 70, is_lab: 0, location: "Second Floor SF-31", equipment: "Projector, Audio System, Smart Board" },
    { id: randomUUID(), name: "SF-32", capacity: 70, is_lab: 0, location: "Second Floor SF-32", equipment: "Projector, Audio System" },
    { id: randomUUID(), name: "SF-33", capacity: 70, is_lab: 0, location: "Second Floor SF-33", equipment: "Projector, Audio System, Smart Board" },
    { id: randomUUID(), name: "TF-31", capacity: 70, is_lab: 0, location: "Third Floor TF-31", equipment: "Projector, Audio System" },
    { id: randomUUID(), name: "TF-32", capacity: 70, is_lab: 0, location: "Third Floor TF-32", equipment: "Projector, Audio System" },
    { id: randomUUID(), name: "FF-22", capacity: 60, is_lab: 0, location: "First Floor FF-22", equipment: "Projector" },
    { id: randomUUID(), name: "Jack Kilby Hall", capacity: 120, is_lab: 0, location: "Ground Floor", equipment: "Podium, Dual Projectors, Sound System" },

    // Laboratories (9) — Flagged with is_lab: 1
    { id: randomUUID(), name: "System Software Lab (FF-21)", capacity: 35, is_lab: 1, location: "First Floor FF-21", equipment: "35 High-End Linux Workstations, GCC/GDB" },
    { id: randomUUID(), name: "Programming Lab-1 (FF-28)", capacity: 35, is_lab: 1, location: "First Floor FF-28", equipment: "35 Systems, Oracle/MySQL, Java/Python" },
    { id: randomUUID(), name: "Programming Lab-2 (FF-28)", capacity: 35, is_lab: 1, location: "First Floor FF-28", equipment: "35 Systems, Network Simulator, Wireshark" },
    { id: randomUUID(), name: "Analog Circuit Lab (FF-33)", capacity: 35, is_lab: 1, location: "First Floor FF-33", equipment: "DSO, Function Generators, Multimeters, Breadboards" },
    { id: randomUUID(), name: "EDC Lab (FF-34)", capacity: 35, is_lab: 1, location: "First Floor FF-34", equipment: "Semiconductor Kits, CRO, Power Supplies" },
    { id: randomUUID(), name: "Communication Lab (FF-36)", capacity: 35, is_lab: 1, location: "First Floor FF-36", equipment: "RF Modulators, Optical Fiber Trainers" },
    { id: randomUUID(), name: "DMP Lab (FF-38)", capacity: 35, is_lab: 1, location: "First Floor FF-38", equipment: "Microprocessor & 8051 Kits, FPGA Boards" },
    { id: randomUUID(), name: "Data Science Lab-II (FF-40)", capacity: 35, is_lab: 1, location: "First Floor FF-40", equipment: "GPU Systems, Jupyter Notebooks, Node.js" },
    { id: randomUUID(), name: "Electronic Workshop Lab (FF-30)", capacity: 35, is_lab: 1, location: "First Floor FF-30", equipment: "PCB Milling, Soldering Stations, Basic Electrical" },
  ];
  const roomMap = new Map();
  const insertRoom = db.prepare(
    "INSERT INTO classrooms (id, name, capacity, is_lab, location, equipment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  roomData.forEach((r) => {
    insertRoom.run(r.id, r.name, r.capacity, r.is_lab, r.location, r.equipment, now, now);
    roomMap.set(r.name, r.id);
  });
  console.log(`✓ Added ${roomData.length} Classrooms (7 Lecture Halls, 9 Laboratories)`);

  // 5. Default Class-Classroom Assignments (each class has a dedicated lecture room)
  const insertClassRoom = db.prepare(
    "INSERT INTO class_classroom_assignments (id, class_id, classroom_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  );
  const defaultRooms = [
    { class: "SE-ECCE", room: "SF-31" },
    { class: "SE-AIDS", room: "SF-32" },
    { class: "TY-ECCE", room: "SF-33" },
    { class: "TY-AIDS", room: "TF-31" },
    { class: "B.Tech-ECCE", room: "TF-32" },
    { class: "B.Tech-AIDS", room: "FF-22" },
  ];
  defaultRooms.forEach((dr) => {
    insertClassRoom.run(randomUUID(), classMap.get(dr.class), roomMap.get(dr.room), now, now);
  });
  console.log(`✓ Assigned 6 Classes to dedicated Lecture Halls`);

  // 6. Faculty Members (19 Faculty Members from JNEC)
  const teacherData = [
    { name: "Dr. S. N. Pawar", email: "snpawar@jnec.ac.in", designation: "Professor & HOD", specialization: "Computer Networks & Wireless Communication" },
    { name: "Prof. F. I. Shaikh", email: "fishaikh@jnec.ac.in", designation: "Associate Professor", specialization: "Electronic Devices & Digital Image Processing" },
    { name: "Dr. V. B. Malode", email: "vbmalode@jnec.ac.in", designation: "Associate Professor", specialization: "Data Structures & CMOS Design" },
    { name: "Dr. V. A. More", email: "vamore@jnec.ac.in", designation: "Associate Professor", specialization: "Analog Circuits & Electrical Engineering" },
    { name: "Prof. V. A. Kulkarni", email: "vakulkarni@jnec.ac.in", designation: "Associate Professor", specialization: "Digital System Design & Embedded Systems" },
    { name: "Prof. S. A. Annadate", email: "saannadate@jnec.ac.in", designation: "Associate Professor", specialization: "Software Engineering & Image Processing" },
    { name: "Prof. G. R. Basole", email: "grbasole@jnec.ac.in", designation: "Assistant Professor & HOD ICE", specialization: "Automotive Electronics & Community Engagement" },
    { name: "Prof. A. P. Phatale", email: "apphatale@jnec.ac.in", designation: "Associate Professor", specialization: "Operating Systems & Databases" },
    { name: "Prof. A. R. Salunke", email: "arsalunke@jnec.ac.in", designation: "Assistant Professor", specialization: "Computer Networks & Network Security" },
    { name: "Dr. C. S. Khandelwal", email: "cskhandelwal@jnec.ac.in", designation: "Associate Professor", specialization: "Database Management & Data Analytics" },
    { name: "Prof. S. D. Jadhav", email: "sdjadhav@jnec.ac.in", designation: "Assistant Professor", specialization: "Probability & Statistics, Business Management" },
    { name: "Prof. M. A. Mulay", email: "mamulay@jnec.ac.in", designation: "Assistant Professor", specialization: "Digital Systems & Analog Circuits" },
    { name: "Dr. S. D. Gavarskar", email: "sdgavarskar@jnec.ac.in", designation: "Assistant Professor", specialization: "Data Structures & Algorithms" },
    { name: "Prof. M. K. Pawar", email: "mkpawar@jnec.ac.in", designation: "Assistant Professor", specialization: "Data Science & Web Development" },
    { name: "Prof. P. B. Murmude", email: "pbmurmude@jnec.ac.in", designation: "Assistant Professor", specialization: "Web Development Framework & IoT" },
    { name: "Prof. A. G. Patil", email: "agpatil@jnec.ac.in", designation: "Assistant Professor", specialization: "Specialized Honors & Systems" },
    { name: "Prof. P. P. Patil", email: "pppatil@jnec.ac.in", designation: "Assistant Professor", specialization: "Natural Language Processing & AI" },
    { name: "Prof. V. J. Lipne", email: "vjlipne@jnec.ac.in", designation: "Assistant Professor", specialization: "Artificial Intelligence & Industry Projects" },
    { name: "Prof. R. L. Mudbe", email: "rlmudbe@jnec.ac.in", designation: "Assistant Professor", specialization: "Engineering Exploration & NCC" },
  ];
  const teacherMap = new Map();
  const insertTeacher = db.prepare(
    "INSERT INTO teachers (id, name, email, specialization, max_periods_per_day, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  teacherData.forEach((t) => {
    const id = randomUUID();
    insertTeacher.run(id, t.name, t.email, t.specialization, 5, now, now);
    teacherMap.set(t.name, id);
  });
  console.log(`✓ Added ${teacherData.length} Faculty Members`);

  // 7. Complete Curricula: Theory & 2-Hour Practical Lab Sessions
  const subjectList = [
    // SE-ECCE
    { name: "Digital System Design (DSD)", code: "EC201", periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-ECCE"], teachers: ["Prof. M. A. Mulay", "Prof. V. A. Kulkarni"] },
    { name: "DSD Lab", code: "EC201L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["SE-ECCE"], teachers: ["Prof. M. A. Mulay"] },
    { name: "Data Structures (DS)", code: "EC202", periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-ECCE"], teachers: ["Dr. V. B. Malode", "Dr. S. D. Gavarskar"] },
    { name: "DS Lab", code: "EC202L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["SE-ECCE"], teachers: ["Dr. V. B. Malode", "Dr. S. D. Gavarskar"] },
    { name: "Electronic Circuits & Network Theory (EC&NT)", code: "EC203", periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-ECCE"], teachers: ["Dr. V. B. Malode", "Prof. F. I. Shaikh"] },
    { name: "EC&NT Lab", code: "EC203L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["SE-ECCE"], teachers: ["Prof. F. I. Shaikh"] },
    { name: "Business Management & Financial Accounting (BMFA)", code: "EC204", periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-ECCE"], teachers: ["Prof. S. D. Jadhav"] },
    { name: "Community Engagement", code: "EC205L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["SE-ECCE"], teachers: ["Prof. G. R. Basole"] },
    { name: "Multidisciplinary Minor (MDM)", code: "EC206", periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-ECCE"], teachers: ["Dr. S. D. Gavarskar"] },
    { name: "Constitution of India", code: "EC207", periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-ECCE"], teachers: ["Prof. G. R. Basole"] },

    // SE-AIDS
    { name: "Digital Systems & Microprocessors (DS&MP)", code: "AI201", periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-AIDS"], teachers: ["Prof. V. A. Kulkarni"] },
    { name: "DS&MP Lab", code: "AI201L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["SE-AIDS"], teachers: ["Prof. V. A. Kulkarni"] },
    { name: "Data Structures (AIDS)", code: "AI202", periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-AIDS"], teachers: ["Dr. S. D. Gavarskar", "Dr. V. B. Malode"] },
    { name: "DS Lab (AIDS)", code: "AI202L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["SE-AIDS"], teachers: ["Dr. S. D. Gavarskar", "Dr. V. B. Malode"] },
    { name: "Probability & Random Processes (PB&RP)", code: "AI203", periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-AIDS"], teachers: ["Prof. S. D. Jadhav"] },
    { name: "Web Development Lab (SE)", code: "AI204L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["SE-AIDS"], teachers: ["Prof. M. K. Pawar"] },
    { name: "BM&FA (AIDS)", code: "AI205", periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-AIDS"], teachers: ["Prof. S. D. Jadhav"] },
    { name: "Community Engagement (AIDS)", code: "AI206L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["SE-AIDS"], teachers: ["Prof. G. R. Basole"] },
    { name: "MDM (AIDS)", code: "AI207", periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-AIDS"], teachers: ["Dr. C. S. Khandelwal"] },
    { name: "Constitution of India (AIDS)", code: "AI208", periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-AIDS"], teachers: ["Prof. G. R. Basole"] },

    // TY-ECCE
    { name: "Computer Networks (ECCE)", code: "EC301", periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-ECCE"], teachers: ["Prof. A. R. Salunke", "Dr. S. N. Pawar"] },
    { name: "CN Lab (ECCE)", code: "EC301L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-ECCE"], teachers: ["Prof. A. R. Salunke"] },
    { name: "Operating Systems (ECCE)", code: "EC302", periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-ECCE"], teachers: ["Prof. A. P. Phatale"] },
    { name: "OS Lab (ECCE)", code: "EC302L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-ECCE"], teachers: ["Prof. A. P. Phatale"] },
    { name: "Database Management Systems (ECCE)", code: "EC303", periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-ECCE"], teachers: ["Dr. C. S. Khandelwal", "Prof. A. P. Phatale"] },
    { name: "DBMS Lab (ECCE)", code: "EC303L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-ECCE"], teachers: ["Dr. C. S. Khandelwal"] },
    { name: "Analog Communication (AC)", code: "EC304", periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-ECCE"], teachers: ["Prof. M. A. Mulay", "Dr. V. A. More"] },
    { name: "AC Lab", code: "EC304L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-ECCE"], teachers: ["Prof. M. A. Mulay"] },
    { name: "PE-I (IoT)", code: "EC305", periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-ECCE"], teachers: ["Prof. F. I. Shaikh", "Prof. P. B. Murmude"] },
    { name: "IoT Lab", code: "EC305L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-ECCE"], teachers: ["Prof. P. B. Murmude"] },
    { name: "MDM (TY-ECCE)", code: "EC306", periods: 2, is_lab: 0, lab_dur: 1, classes: ["TY-ECCE"], teachers: ["Prof. P. B. Murmude"] },

    // TY-AIDS
    { name: "Computer Networks (TY-AIDS)", code: "AI301", periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-AIDS"], teachers: ["Prof. A. R. Salunke", "Dr. S. N. Pawar"] },
    { name: "CN Lab (TY-AIDS)", code: "AI301L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-AIDS"], teachers: ["Prof. A. R. Salunke"] },
    { name: "Operating Systems (TY-AIDS)", code: "AI302", periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-AIDS"], teachers: ["Prof. A. P. Phatale"] },
    { name: "OS Lab (TY-AIDS)", code: "AI302L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-AIDS"], teachers: ["Prof. A. P. Phatale"] },
    { name: "DBMS (TY-AIDS)", code: "AI303", periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-AIDS"], teachers: ["Dr. C. S. Khandelwal"] },
    { name: "DBMS Lab (TY-AIDS)", code: "AI303L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-AIDS"], teachers: ["Dr. C. S. Khandelwal"] },
    { name: "Data Science (TY-AIDS)", code: "AI304", periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-AIDS"], teachers: ["Prof. M. K. Pawar"] },
    { name: "DS Lab (TY-AIDS)", code: "AI304L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-AIDS"], teachers: ["Prof. M. K. Pawar"] },
    { name: "PE-I (TY-AIDS)", code: "AI305", periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-AIDS"], teachers: ["Prof. V. A. Kulkarni"] },
    { name: "MDM (TY-AIDS)", code: "AI306", periods: 2, is_lab: 0, lab_dur: 1, classes: ["TY-AIDS"], teachers: ["Dr. S. D. Gavarskar"] },

    // B.Tech-ECCE
    { name: "Digital Signal Processing (DSP)", code: "EC401", periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-ECCE"], teachers: ["Prof. F. I. Shaikh", "Prof. M. A. Mulay"] },
    { name: "DSP Lab", code: "EC401L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-ECCE"], teachers: ["Prof. F. I. Shaikh"] },
    { name: "Computer Networks (B.Tech-ECCE)", code: "EC402", periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-ECCE"], teachers: ["Dr. S. N. Pawar", "Prof. S. D. Jadhav"] },
    { name: "CN Lab (B.Tech-ECCE)", code: "EC402L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-ECCE"], teachers: ["Prof. S. D. Jadhav"] },
    { name: "Software Engineering (ECCE)", code: "EC403", periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-ECCE"], teachers: ["Prof. S. A. Annadate"] },
    { name: "Software Engineering Lab (ECCE)", code: "EC403L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-ECCE"], teachers: ["Prof. S. A. Annadate"] },
    { name: "PE-III (DIP)", code: "EC404", periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-ECCE"], teachers: ["Prof. F. I. Shaikh", "Prof. S. A. Annadate"] },
    { name: "DIP Lab", code: "EC404L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-ECCE"], teachers: ["Prof. S. A. Annadate"] },
    { name: "PE-IV (AI)", code: "EC405", periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-ECCE"], teachers: ["Prof. V. J. Lipne"] },
    { name: "AI Lab (ECCE)", code: "EC405L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-ECCE"], teachers: ["Prof. V. J. Lipne"] },
    { name: "Business Management (ECCE)", code: "EC406", periods: 2, is_lab: 0, lab_dur: 1, classes: ["B.Tech-ECCE"], teachers: ["Prof. S. D. Jadhav"] },

    // B.Tech-AIDS
    { name: "Natural Language Processing (NLP)", code: "AI401", periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-AIDS"], teachers: ["Prof. P. P. Patil"] },
    { name: "NLP Lab", code: "AI401L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-AIDS"], teachers: ["Prof. P. P. Patil"] },
    { name: "Computer Networks (B.Tech-AIDS)", code: "AI402", periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-AIDS"], teachers: ["Dr. S. N. Pawar", "Prof. A. R. Salunke"] },
    { name: "CN Lab (B.Tech-AIDS)", code: "AI402L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-AIDS"], teachers: ["Prof. A. R. Salunke"] },
    { name: "Software Engineering (AIDS)", code: "AI403", periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-AIDS"], teachers: ["Prof. S. A. Annadate"] },
    { name: "Software Engineering Lab (AIDS)", code: "AI403L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-AIDS"], teachers: ["Prof. S. A. Annadate"] },
    { name: "Web Development (AIDS)", code: "AI404", periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-AIDS"], teachers: ["Prof. M. K. Pawar", "Prof. P. B. Murmude"] },
    { name: "Web Development Lab (AIDS)", code: "AI404L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-AIDS"], teachers: ["Prof. M. K. Pawar"] },
    { name: "PE-III (AIDS)", code: "AI405", periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-AIDS"], teachers: ["Prof. V. J. Lipne", "Prof. P. P. Patil"] },
    { name: "PE-III Lab (AIDS)", code: "AI405L", periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-AIDS"], teachers: ["Prof. V. J. Lipne"] },
    { name: "Business Management (AIDS)", code: "AI406", periods: 2, is_lab: 0, lab_dur: 1, classes: ["B.Tech-AIDS"], teachers: ["Prof. S. D. Jadhav"] },
  ];

  const insertSubject = db.prepare(
    "INSERT INTO subjects (id, name, code, periods_per_week, is_lab, lab_duration_hours, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertSubjClass = db.prepare(
    "INSERT INTO subject_class_assignments (id, subject_id, class_id, created_at) VALUES (?, ?, ?, ?)"
  );
  const insertTeacherSubject = db.prepare(
    "INSERT INTO teacher_subject_assignments (id, teacher_id, subject_id, created_at) VALUES (?, ?, ?, ?)"
  );

  let labCount = 0;
  let theoryCount = 0;

  subjectList.forEach((s) => {
    const sId = randomUUID();
    insertSubject.run(sId, s.name, s.code, s.periods, s.is_lab, s.lab_dur, now, now);
    if (s.is_lab) labCount++;
    else theoryCount++;

    // Assign Subject to Classes
    s.classes.forEach((cName) => {
      const cId = classMap.get(cName);
      if (cId) {
        insertSubjClass.run(randomUUID(), sId, cId, now);
      }
    });

    // Assign Subject to Qualified Teachers
    s.teachers.forEach((tName) => {
      const tId = teacherMap.get(tName);
      if (tId) {
        insertTeacherSubject.run(randomUUID(), tId, sId, now);
      }
    });
  });

  console.log(`✓ Added ${subjectList.length} Subjects (${theoryCount} Theory courses, ${labCount} Practical Labs)`);
  console.log(`✓ Configured Subject-Class & Teacher-Subject assignments`);

  // 8. Provision User Accounts for Faculty and Students
  console.log("🔐 Provisioning user accounts for Faculty and Class Representatives...");
  teacherData.forEach((t) => {
    const tId = teacherMap.get(t.name);
    createUser({
      name: t.name,
      email: t.email,
      password: "teacher123",
      role: "teacher",
      teacher_id: tId,
    });
  });

  classData.forEach((c) => {
    const classSlug = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    createUser({
      name: `${c.name} Representative`,
      email: `student.${classSlug}@jnec.ac.in`,
      password: "student123",
      role: "student",
      class_id: c.id,
    });
  });
  console.log(`✓ Created 19 Teacher accounts (password: teacher123) and 6 Student accounts (password: student123)`);

  // 9. Generate Initial Baseline Conflict-Free Master Timetable with GA
  console.log("\n🧬 Running Genetic Algorithm Master Timetable Generator...");
  const tStart = Date.now();
  const timetableResult = generateTimetable({
    name: "JNEC Master Academic Timetable (Odd Sem 2025-26)",
    academicYear: "2025-2026",
    timingId: timing.id,
    popSize: 50,
    maxGenerations: 100,
  });
  const duration = ((Date.now() - tStart) / 1000).toFixed(2);

  console.log("\n========================================================");
  console.log("🎉 JNEC College Dataset Seeding & GA Generation Complete!");
  console.log("========================================================");
  console.log(`Timetable ID: ${timetableResult.id}`);
  console.log(`Name: ${timetableResult.name}`);
  console.log(`Total Lessons Scheduled: ${timetableResult.lessonsScheduled}`);
  console.log(`Hard Constraint Violations: ${timetableResult.hardViolations}`);
  console.log(`Fitness Score: ${timetableResult.fitness}`);
  console.log(`Teacher Idle Gaps: ${timetableResult.totalGaps}`);
  console.log(`Generation Time: ${duration}s`);
  console.log("========================================================\n");

  return timetableResult;
}

if (require.main === module) {
  seedCollegeData();
}

module.exports = { seedCollegeData };
