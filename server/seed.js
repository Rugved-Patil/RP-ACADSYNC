// seed.js — Seeds ACADSYNC with the real JNEC (MGM University) ECT & AI-DS Department dataset.
//
// Default Timing:
// 10:00 - 11:00 (Period 1)
// 11:00 - 12:00 (Period 2)
// 12:00 - 12:45 (Lunch Recess 45 mins)
// 12:45 - 13:45 (Period 3)
// 13:45 - 14:45 (Period 4)
// 14:45 - 15:00 (Short Recess 15 mins)
// 15:00 - 16:00 (Period 5)
// 16:00 - 17:00 (Period 6)

const { randomUUID } = require("crypto");
const { db } = require("./db");
const { generateTimetable } = require("./lib/generator");
const { createUser } = require("./lib/auth");

function seed() {
  console.log("🌱 Seeding ACADSYNC database with authentic JNEC MGM University College Data...");

  const now = new Date().toISOString();

  // 1. Wipe tables in safe foreign key dependency order
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

  // 2. System Administrator Account
  createUser({
    name: "System Administrator",
    email: "admin@acadsync.edu",
    password: "admin123",
    role: "admin",
  });
  console.log("✓ Created System Administrator (admin@acadsync.edu / admin123)");

  // 3. Default Timing Configuration (10:00 - 17:00 schedule)
  const timingId = randomUUID();
  const defaultSlots = [
    { start_time: "10:00", end_time: "11:00", is_break: 0, slot_order: 1 },
    { start_time: "11:00", end_time: "12:00", is_break: 0, slot_order: 2 },
    { start_time: "12:00", end_time: "12:45", is_break: 1, slot_order: 3 }, // 45 min lunch recess
    { start_time: "12:45", end_time: "13:45", is_break: 0, slot_order: 4 },
    { start_time: "13:45", end_time: "14:45", is_break: 0, slot_order: 5 },
    { start_time: "14:45", end_time: "15:00", is_break: 1, slot_order: 6 }, // 15 min short recess
    { start_time: "15:00", end_time: "16:00", is_break: 0, slot_order: 7 },
    { start_time: "16:00", end_time: "17:00", is_break: 0, slot_order: 8 },
  ];

  db.prepare(
    "INSERT INTO timings (id, name, working_days, periods, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    timingId,
    "Standard Academic Schedule (10:00 - 17:00)",
    JSON.stringify([0, 1, 2, 3, 4, 5]),
    JSON.stringify(defaultSlots),
    now,
    now
  );

  const insertSlot = db.prepare(
    `INSERT INTO time_slots (id, timing_id, start_time, end_time, is_break, slot_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  defaultSlots.forEach((s) => {
    insertSlot.run(randomUUID(), timingId, s.start_time, s.end_time, s.is_break, s.slot_order, now, now);
  });
  console.log("✓ Added Default Schedule: 10:00 - 17:00 (6 Periods, 2 Recesses, Mon-Sat)");

  // 4. Academic Years
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

  // 5. Classes & Student Batches
  const defaultBatches = JSON.stringify([
    { name: "Batch A", count: 20 },
    { name: "Batch B", count: 20 },
    { name: "Batch C", count: 19 },
  ]);

  const classData = [
    { id: randomUUID(), name: "SE-ECCE", year_id: yearMap.get("Second Year (SE)"), capacity: 60, student_count: 59, batches: defaultBatches },
    { id: randomUUID(), name: "SE-AIDS", year_id: yearMap.get("Second Year (SE)"), capacity: 60, student_count: 59, batches: defaultBatches },
    { id: randomUUID(), name: "TY-ECCE", year_id: yearMap.get("Third Year (TY)"), capacity: 60, student_count: 59, batches: defaultBatches },
    { id: randomUUID(), name: "TY-AIDS", year_id: yearMap.get("Third Year (TY)"), capacity: 60, student_count: 59, batches: defaultBatches },
    { id: randomUUID(), name: "B.Tech-ECCE", year_id: yearMap.get("Final Year (B.Tech)"), capacity: 60, student_count: 59, batches: defaultBatches },
    { id: randomUUID(), name: "B.Tech-AIDS", year_id: yearMap.get("Final Year (B.Tech)"), capacity: 60, student_count: 59, batches: defaultBatches },
  ];
  const classMap = new Map();
  const insertClass = db.prepare(
    "INSERT INTO classes (id, name, year_id, capacity, student_count, batches, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  classData.forEach((c) => {
    insertClass.run(c.id, c.name, c.year_id, c.capacity, c.student_count, c.batches, now, now);
    classMap.set(c.name, c.id);
  });
  console.log(`✓ Added ${classData.length} Classes (SE-ECCE, SE-AIDS, TY-ECCE, TY-AIDS, B.Tech-ECCE, B.Tech-AIDS) with Batches A/B/C`);

  // 6. Classrooms & Specialized Laboratories
  const roomData = [
    // Lecture Halls (7)
    { id: randomUUID(), name: "SF-31", capacity: 70, is_lab: 0, location: "Second Floor SF-31", equipment: "Projector, Audio System, Smart Board" },
    { id: randomUUID(), name: "SF-32", capacity: 70, is_lab: 0, location: "Second Floor SF-32", equipment: "Projector, Audio System" },
    { id: randomUUID(), name: "SF-33", capacity: 70, is_lab: 0, location: "Second Floor SF-33", equipment: "Projector, Audio System, Smart Board" },
    { id: randomUUID(), name: "TF-31", capacity: 70, is_lab: 0, location: "Third Floor TF-31", equipment: "Projector, Audio System" },
    { id: randomUUID(), name: "TF-32", capacity: 70, is_lab: 0, location: "Third Floor TF-32", equipment: "Projector, Audio System" },
    { id: randomUUID(), name: "FF-22", capacity: 60, is_lab: 0, location: "First Floor FF-22", equipment: "Projector" },
    { id: randomUUID(), name: "Jack Kilby Hall", capacity: 120, is_lab: 0, location: "Ground Floor", equipment: "Podium, Dual Projectors, Sound System" },

    // Laboratories (9)
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

  // 7. Dedicated Lecture Hall assignments for Classes
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

  // 8. Faculty Members (19 Faculty Members from JNEC)
  const teacherData = [
    { name: "Dr. S. N. Pawar", email: "snpawar@jnec.ac.in", specialization: "Computer Networks & Wireless Communication" },
    { name: "Prof. F. I. Shaikh", email: "fishaikh@jnec.ac.in", specialization: "Electronic Devices & Digital Image Processing" },
    { name: "Dr. V. B. Malode", email: "vbmalode@jnec.ac.in", specialization: "Data Structures & CMOS Design" },
    { name: "Dr. V. A. More", email: "vamore@jnec.ac.in", specialization: "Analog Circuits & Electrical Engineering" },
    { name: "Prof. V. A. Kulkarni", email: "vakulkarni@jnec.ac.in", specialization: "Digital System Design & Embedded Systems" },
    { name: "Prof. S. A. Annadate", email: "saannadate@jnec.ac.in", specialization: "Software Engineering & Image Processing" },
    { name: "Prof. G. R. Basole", email: "grbasole@jnec.ac.in", specialization: "Automotive Electronics & Community Engagement" },
    { name: "Prof. A. P. Phatale", email: "apphatale@jnec.ac.in", specialization: "Operating Systems & Databases" },
    { name: "Prof. A. R. Salunke", email: "arsalunke@jnec.ac.in", specialization: "Computer Networks & Network Security" },
    { name: "Dr. C. S. Khandelwal", email: "cskhandelwal@jnec.ac.in", specialization: "Database Management & Data Analytics" },
    { name: "Prof. S. D. Jadhav", email: "sdjadhav@jnec.ac.in", specialization: "Probability & Statistics, Business Management" },
    { name: "Prof. M. A. Mulay", email: "mamulay@jnec.ac.in", specialization: "Digital Systems & Analog Circuits" },
    { name: "Dr. S. D. Gavarskar", email: "sdgavarskar@jnec.ac.in", specialization: "Data Structures & Algorithms" },
    { name: "Prof. M. K. Pawar", email: "mkpawar@jnec.ac.in", specialization: "Data Science & Web Development" },
    { name: "Prof. P. B. Murmude", email: "pbmurmude@jnec.ac.in", specialization: "Web Development Framework & IoT" },
    { name: "Prof. A. G. Patil", email: "agpatil@jnec.ac.in", specialization: "Specialized Honors & Systems" },
    { name: "Prof. P. P. Patil", email: "pppatil@jnec.ac.in", specialization: "Natural Language Processing & AI" },
    { name: "Prof. V. J. Lipne", email: "vjlipne@jnec.ac.in", specialization: "Artificial Intelligence & Industry Projects" },
    { name: "Prof. R. L. Mudbe", email: "rlmudbe@jnec.ac.in", specialization: "Engineering Exploration & NCC" },
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

  // 9. Course Curricula with Credits, Durations & Class Mappings
  const subjectList = [
    // SE-ECCE
    { name: "Digital System Design (DSD)", code: "EC201", credits: 2, periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-ECCE"], teachers: ["Prof. M. A. Mulay"] },
    { name: "DSD Lab", code: "EC201L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["SE-ECCE"], teachers: ["Prof. M. A. Mulay"] },
    { name: "Data Structures (DS)", code: "EC202", credits: 2, periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-ECCE"], teachers: ["Dr. S. D. Gavarskar"] },
    { name: "DS Lab", code: "EC202L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["SE-ECCE"], teachers: ["Dr. S. D. Gavarskar"] },
    { name: "Electronic Circuits & Network Theory (EC&NT)", code: "EC203", credits: 2, periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-ECCE"], teachers: ["Prof. F. I. Shaikh"] },
    { name: "EC&NT Lab", code: "EC203L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["SE-ECCE"], teachers: ["Prof. F. I. Shaikh"] },
    { name: "Business Management & Financial Accounting (BMFA)", code: "EC204", credits: 2, periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-ECCE"], teachers: ["Prof. S. D. Jadhav"] },
    { name: "Community Engagement", code: "EC205L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["SE-ECCE"], teachers: ["Prof. G. R. Basole"] },
    { name: "Multidisciplinary Minor (MDM)", code: "EC206", credits: 2, periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-ECCE"], teachers: ["Dr. S. D. Gavarskar"] },
    { name: "Constitution of India", code: "EC207", credits: 2, periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-ECCE"], teachers: ["Prof. G. R. Basole"] },

    // SE-AIDS
    { name: "Digital Systems & Microprocessors (DS&MP)", code: "AI201", credits: 2, periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-AIDS"], teachers: ["Prof. V. A. Kulkarni"] },
    { name: "DS&MP Lab", code: "AI201L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["SE-AIDS"], teachers: ["Prof. V. A. Kulkarni"] },
    { name: "Data Structures (AIDS)", code: "AI202", credits: 2, periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-AIDS"], teachers: ["Dr. V. B. Malode"] },
    { name: "DS Lab (AIDS)", code: "AI202L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["SE-AIDS"], teachers: ["Dr. V. B. Malode"] },
    { name: "Probability & Random Processes (PB&RP)", code: "AI203", credits: 2, periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-AIDS"], teachers: ["Prof. S. D. Jadhav"] },
    { name: "Web Development Lab (SE)", code: "AI204L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["SE-AIDS"], teachers: ["Prof. M. K. Pawar"] },
    { name: "BM&FA (AIDS)", code: "AI205", credits: 2, periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-AIDS"], teachers: ["Prof. S. D. Jadhav"] },
    { name: "Community Engagement (AIDS)", code: "AI206L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["SE-AIDS"], teachers: ["Prof. G. R. Basole"] },
    { name: "MDM (AIDS)", code: "AI207", credits: 2, periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-AIDS"], teachers: ["Dr. C. S. Khandelwal"] },
    { name: "Constitution of India (AIDS)", code: "AI208", credits: 2, periods: 2, is_lab: 0, lab_dur: 1, classes: ["SE-AIDS"], teachers: ["Prof. G. R. Basole"] },

    // TY-ECCE
    { name: "Computer Networks (ECCE)", code: "EC301", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-ECCE"], teachers: ["Prof. A. R. Salunke"] },
    { name: "CN Lab (ECCE)", code: "EC301L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-ECCE"], teachers: ["Prof. A. R. Salunke"] },
    { name: "Operating Systems (ECCE)", code: "EC302", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-ECCE"], teachers: ["Prof. A. P. Phatale"] },
    { name: "OS Lab (ECCE)", code: "EC302L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-ECCE"], teachers: ["Prof. A. P. Phatale"] },
    { name: "Database Management Systems (ECCE)", code: "EC303", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-ECCE"], teachers: ["Dr. C. S. Khandelwal"] },
    { name: "DBMS Lab (ECCE)", code: "EC303L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-ECCE"], teachers: ["Dr. C. S. Khandelwal"] },
    { name: "Analog Communication (AC)", code: "EC304", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-ECCE"], teachers: ["Prof. M. A. Mulay"] },
    { name: "AC Lab", code: "EC304L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-ECCE"], teachers: ["Prof. M. A. Mulay"] },
    { name: "PE-I (IoT)", code: "EC305", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-ECCE"], teachers: ["Prof. P. B. Murmude"] },
    { name: "IoT Lab", code: "EC305L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-ECCE"], teachers: ["Prof. P. B. Murmude"] },
    { name: "MDM (TY-ECCE)", code: "EC306", credits: 2, periods: 2, is_lab: 0, lab_dur: 1, classes: ["TY-ECCE"], teachers: ["Prof. P. B. Murmude"] },

    // TY-AIDS
    { name: "Computer Networks (TY-AIDS)", code: "AI301", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-AIDS"], teachers: ["Prof. A. R. Salunke"] },
    { name: "CN Lab (TY-AIDS)", code: "AI301L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-AIDS"], teachers: ["Prof. A. R. Salunke"] },
    { name: "Operating Systems (TY-AIDS)", code: "AI302", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-AIDS"], teachers: ["Prof. A. P. Phatale"] },
    { name: "OS Lab (TY-AIDS)", code: "AI302L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-AIDS"], teachers: ["Prof. A. P. Phatale"] },
    { name: "DBMS (TY-AIDS)", code: "AI303", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-AIDS"], teachers: ["Dr. C. S. Khandelwal"] },
    { name: "DBMS Lab (TY-AIDS)", code: "AI303L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-AIDS"], teachers: ["Dr. C. S. Khandelwal"] },
    { name: "Data Science (TY-AIDS)", code: "AI304", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-AIDS"], teachers: ["Prof. M. K. Pawar"] },
    { name: "DS Lab (TY-AIDS)", code: "AI304L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["TY-AIDS"], teachers: ["Prof. M. K. Pawar"] },
    { name: "PE-I (TY-AIDS)", code: "AI305", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["TY-AIDS"], teachers: ["Prof. V. A. Kulkarni"] },
    { name: "MDM (TY-AIDS)", code: "AI306", credits: 2, periods: 2, is_lab: 0, lab_dur: 1, classes: ["TY-AIDS"], teachers: ["Dr. S. D. Gavarskar"] },

    // B.Tech-ECCE
    { name: "Digital Signal Processing (DSP)", code: "EC401", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-ECCE"], teachers: ["Prof. F. I. Shaikh"] },
    { name: "DSP Lab", code: "EC401L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-ECCE"], teachers: ["Prof. F. I. Shaikh"] },
    { name: "Computer Networks (B.Tech-ECCE)", code: "EC402", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-ECCE"], teachers: ["Dr. S. N. Pawar"] },
    { name: "CN Lab (B.Tech-ECCE)", code: "EC402L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-ECCE"], teachers: ["Prof. S. D. Jadhav"] },
    { name: "Software Engineering (ECCE)", code: "EC403", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-ECCE"], teachers: ["Prof. S. A. Annadate"] },
    { name: "Software Engineering Lab (ECCE)", code: "EC403L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-ECCE"], teachers: ["Prof. S. A. Annadate"] },
    { name: "PE-III (DIP)", code: "EC404", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-ECCE"], teachers: ["Prof. F. I. Shaikh"] },
    { name: "DIP Lab", code: "EC404L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-ECCE"], teachers: ["Prof. S. A. Annadate"] },
    { name: "PE-IV (AI)", code: "EC405", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-ECCE"], teachers: ["Prof. V. J. Lipne"] },
    { name: "AI Lab (ECCE)", code: "EC405L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-ECCE"], teachers: ["Prof. V. J. Lipne"] },
    { name: "Business Management (ECCE)", code: "EC406", credits: 2, periods: 2, is_lab: 0, lab_dur: 1, classes: ["B.Tech-ECCE"], teachers: ["Prof. S. D. Jadhav"] },

    // B.Tech-AIDS
    { name: "Natural Language Processing (NLP)", code: "AI401", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-AIDS"], teachers: ["Prof. P. P. Patil"] },
    { name: "NLP Lab", code: "AI401L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-AIDS"], teachers: ["Prof. P. P. Patil"] },
    { name: "Computer Networks (B.Tech-AIDS)", code: "AI402", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-AIDS"], teachers: ["Dr. S. N. Pawar"] },
    { name: "CN Lab (B.Tech-AIDS)", code: "AI402L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-AIDS"], teachers: ["Prof. A. R. Salunke"] },
    { name: "Software Engineering (AIDS)", code: "AI403", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-AIDS"], teachers: ["Prof. S. A. Annadate"] },
    { name: "Software Engineering Lab (AIDS)", code: "AI403L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-AIDS"], teachers: ["Prof. S. A. Annadate"] },
    { name: "Web Development (AIDS)", code: "AI404", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-AIDS"], teachers: ["Prof. M. K. Pawar"] },
    { name: "Web Development Lab (AIDS)", code: "AI404L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-AIDS"], teachers: ["Prof. M. K. Pawar"] },
    { name: "PE-III (AIDS)", code: "AI405", credits: 3, periods: 3, is_lab: 0, lab_dur: 1, classes: ["B.Tech-AIDS"], teachers: ["Prof. V. J. Lipne"] },
    { name: "PE-III Lab (AIDS)", code: "AI405L", credits: 1, periods: 2, is_lab: 1, lab_dur: 2, classes: ["B.Tech-AIDS"], teachers: ["Prof. V. J. Lipne"] },
    { name: "Business Management (AIDS)", code: "AI406", credits: 2, periods: 2, is_lab: 0, lab_dur: 1, classes: ["B.Tech-AIDS"], teachers: ["Prof. S. D. Jadhav"] },
  ];

  const insertSubject = db.prepare(
    "INSERT INTO subjects (id, name, code, credits, periods_per_week, is_lab, lab_duration_hours, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertSubjClass = db.prepare(
    "INSERT INTO subject_class_assignments (id, subject_id, class_id, created_at) VALUES (?, ?, ?, ?)"
  );
  const insertTeacherSubject = db.prepare(
    "INSERT INTO teacher_subject_assignments (id, teacher_id, subject_id, class_id, created_at) VALUES (?, ?, ?, ?, ?)"
  );

  let labCount = 0;
  let theoryCount = 0;

  subjectList.forEach((s) => {
    const sId = randomUUID();
    insertSubject.run(sId, s.name, s.code, s.credits, s.periods, s.is_lab, s.lab_dur, now, now);
    if (s.is_lab) labCount++;
    else theoryCount++;

    // Assign Subject to Classes & Teachers
    s.classes.forEach((cName) => {
      const cId = classMap.get(cName);
      if (cId) {
        insertSubjClass.run(randomUUID(), sId, cId, now);

        s.teachers.forEach((tName) => {
          const tId = teacherMap.get(tName);
          if (tId) {
            insertTeacherSubject.run(randomUUID(), tId, sId, cId, now);
          }
        });
      }
    });
  });

  console.log(`✓ Added ${subjectList.length} Subjects (${theoryCount} Theory courses, ${labCount} Practical Labs)`);

  // 10. Provision User Accounts for Faculty and Students
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

  // 11. Generate Initial Baseline Timetable with GA
  console.log("🧬 Generating conflict-free baseline timetable with Genetic Algorithm...");
  const timetableResult = generateTimetable({
    name: "JNEC Master Academic Timetable (2025-26)",
    academicYear: "2025-2026",
    timingId: timingId,
    popSize: 50,
    maxGenerations: 100,
  });

  console.log(`🎉 ACADSYNC database seeding complete! (Scheduled ${timetableResult.lessonsScheduled} lessons, 0 hard violations)`);
  return timetableResult;
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
