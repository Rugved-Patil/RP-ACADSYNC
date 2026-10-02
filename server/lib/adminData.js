// adminData.js — Administration data management features:
// 1. mergeSampleData(): Generates and seamlessly merges a new batch of unique sample
//    academic institutional data (departments, classes, faculty, subjects, labs,
//    assignments, and user logins) with each press of the button.
// 2. killSwitch(): Safely wipes all timetables, lessons, change requests,
//    assignments, classes, teachers, subjects, timings, and classrooms,
//    preserving the active admin user account.

const { randomUUID } = require("node:crypto");
const { db } = require("../db");
const { createUser } = require("./auth");

// Catalog of unique academic departments for multi-batch generation
const DEPARTMENTS_CATALOG = [
  {
    code: "CS",
    name: "Computer Engineering (Advanced Batch)",
    yearNames: ["Third Year (TE)", "Final Year (BE)"],
    classes: [
      { name: "TE-CS-A", year: "Third Year (TE)", capacity: 60, student_count: 56 },
      { name: "TE-CS-B", year: "Third Year (TE)", capacity: 60, student_count: 54 },
      { name: "BE-CS-A", year: "Final Year (BE)", capacity: 60, student_count: 58 },
      { name: "BE-CS-B", year: "Final Year (BE)", capacity: 60, student_count: 57 },
    ],
    teachers: [
      { name: "Dr. Sunita Rao", email: "sunita.rao@institution.edu", specialization: "Cloud Computing & Distributed Systems" },
      { name: "Prof. Rohan Patil", email: "rohan.patil@institution.edu", specialization: "Artificial Intelligence & Deep Learning" },
      { name: "Prof. Neha Gupta", email: "neha.gupta@institution.edu", specialization: "Compiler Construction & NLP" },
      { name: "Prof. Anand Kadam", email: "anand.kadam@institution.edu", specialization: "Cybersecurity & Blockchain" },
    ],
    subjects: [
      { name: "Artificial Intelligence", code: "CS401", periods: 3, is_lab: 0 },
      { name: "AI & Deep Learning Lab", code: "CS401L", periods: 2, is_lab: 1, lab_duration_hours: 2 },
      { name: "Cloud Computing Architecture", code: "CS402", periods: 3, is_lab: 0 },
      { name: "Cloud Practicum Lab", code: "CS402L", periods: 2, is_lab: 1, lab_duration_hours: 2 },
      { name: "Compiler Construction", code: "CS501", periods: 3, is_lab: 0 },
      { name: "Information & Cyber Security", code: "CS502", periods: 3, is_lab: 0 },
    ],
    classrooms: [
      { name: "LH-301", capacity: 70, is_lab: 0, location: "Block B, 1st Floor", equipment: "Projector, AC, Smart Board" },
      { name: "LH-302", capacity: 70, is_lab: 0, location: "Block B, 1st Floor", equipment: "Projector, AC" },
      { name: "Lab 3 - Cloud Computing & AI Lab", capacity: 40, is_lab: 1, location: "CS Block, 3rd Floor", equipment: "40 GPU Workstations, Cloud Server Rack" },
      { name: "Seminar Hall B", capacity: 120, is_lab: 0, location: "Block B, Ground Floor", equipment: "Surround Sound, Dual 4K Projectors" },
    ],
  },
  {
    code: "IT",
    name: "Information Technology",
    yearNames: ["Second Year (SE)", "Third Year (TE)", "Final Year (BE)"],
    classes: [
      { name: "SE-IT-A", year: "Second Year (SE)", capacity: 60, student_count: 58 },
      { name: "SE-IT-B", year: "Second Year (SE)", capacity: 60, student_count: 57 },
      { name: "TE-IT-A", year: "Third Year (TE)", capacity: 60, student_count: 55 },
      { name: "TE-IT-B", year: "Third Year (TE)", capacity: 60, student_count: 54 },
    ],
    teachers: [
      { name: "Dr. Ramesh Joshi", email: "ramesh.joshi@institution.edu", specialization: "Cloud & Distributed Systems" },
      { name: "Prof. Neha Deshpande", email: "neha.deshpande@institution.edu", specialization: "Full-Stack Web Architectures" },
      { name: "Prof. Rahul Kulkarni", email: "rahul.kulkarni@institution.edu", specialization: "Information Security & Cryptography" },
      { name: "Dr. Anjali Patil", email: "anjali.patil@institution.edu", specialization: "DevOps & Software Testing" },
    ],
    subjects: [
      { name: "Web Systems & Microservices", code: "IT301", periods: 3, is_lab: 0 },
      { name: "Web Engineering Lab", code: "IT301L", periods: 2, is_lab: 1, lab_duration_hours: 2 },
      { name: "Cloud Infrastructure Management", code: "IT302", periods: 3, is_lab: 0 },
      { name: "Cloud Practicum Lab", code: "IT302L", periods: 2, is_lab: 1, lab_duration_hours: 2 },
      { name: "Distributed Database Engines", code: "IT401", periods: 3, is_lab: 0 },
      { name: "Network Forensics & Defense", code: "IT402", periods: 3, is_lab: 0 },
    ],
    classrooms: [
      { name: "LH-401 (IT Lecture Hall)", capacity: 70, is_lab: 0, location: "Block C, 1st Floor", equipment: "4K Laser Projector, Smart Podium" },
      { name: "LH-402 (IT Lecture Hall)", capacity: 70, is_lab: 0, location: "Block C, 1st Floor", equipment: "Projector, AC" },
      { name: "Lab 4 - Cloud & Web Studio", capacity: 40, is_lab: 1, location: "Block C, 2nd Floor", equipment: "40 Dell Core-i9 Workstations, Gigabit Switch" },
    ],
  },
  {
    code: "AIDS",
    name: "Artificial Intelligence & Data Science",
    yearNames: ["First Year (FE)", "Second Year (SE)", "Third Year (TE)"],
    classes: [
      { name: "FE-AIDS-A", year: "First Year (FE)", capacity: 60, student_count: 60 },
      { name: "SE-AIDS-A", year: "Second Year (SE)", capacity: 60, student_count: 59 },
      { name: "SE-AIDS-B", year: "Second Year (SE)", capacity: 60, student_count: 58 },
      { name: "TE-AIDS-A", year: "Third Year (TE)", capacity: 60, student_count: 56 },
    ],
    teachers: [
      { name: "Dr. Arvind Swaminathan", email: "arvind.swaminathan@institution.edu", specialization: "Natural Language Processing & LLMs" },
      { name: "Prof. Kavita Nair", email: "kavita.nair@institution.edu", specialization: "Big Data Analytics & PySpark" },
      { name: "Prof. Yashwant Shenoy", email: "yashwant.shenoy@institution.edu", specialization: "Computer Vision & GANs" },
      { name: "Dr. Gauri Ranade", email: "gauri.ranade@institution.edu", specialization: "Reinforcement Learning & Robotics" },
    ],
    subjects: [
      { name: "Deep Neural Networks", code: "AD301", periods: 3, is_lab: 0 },
      { name: "Deep Learning Lab", code: "AD301L", periods: 2, is_lab: 1, lab_duration_hours: 2 },
      { name: "Big Data Processing & Hadoop", code: "AD302", periods: 3, is_lab: 0 },
      { name: "Big Data Lab", code: "AD302L", periods: 2, is_lab: 1, lab_duration_hours: 2 },
      { name: "Computer Vision & Processing", code: "AD401", periods: 3, is_lab: 0 },
      { name: "Natural Language Processing", code: "AD402", periods: 3, is_lab: 0 },
    ],
    classrooms: [
      { name: "LH-501 (AI Auditorium)", capacity: 90, is_lab: 0, location: "Block D, Ground Floor", equipment: "Dual Projectors, Dolby Surround, Smart Board" },
      { name: "Lab 5 - AI Supercomputing Lab", capacity: 40, is_lab: 1, location: "Block D, 1st Floor", equipment: "40 NVIDIA RTX 4090 Workstations, TensorRT" },
    ],
  },
  {
    code: "ENTC",
    name: "Electronics & Telecommunication",
    yearNames: ["First Year (FE)", "Second Year (SE)", "Third Year (TE)", "Final Year (BE)"],
    classes: [
      { name: "FE-ENTC-A", year: "First Year (FE)", capacity: 60, student_count: 55 },
      { name: "SE-ENTC-A", year: "Second Year (SE)", capacity: 60, student_count: 54 },
      { name: "TE-ENTC-A", year: "Third Year (TE)", capacity: 60, student_count: 52 },
      { name: "BE-ENTC-A", year: "Final Year (BE)", capacity: 60, student_count: 50 },
    ],
    teachers: [
      { name: "Dr. Hemant Shah", email: "hemant.shah@institution.edu", specialization: "VLSI Design & Embedded Systems" },
      { name: "Prof. Pooja Sen", email: "pooja.sen@institution.edu", specialization: "Digital Signal Processing & Filter Design" },
      { name: "Prof. Sanjay Verma", email: "sanjay.verma@institution.edu", specialization: "Wireless & 5G Cellular Networks" },
      { name: "Dr. Meenakshi Iyer", email: "meenakshi.iyer@institution.edu", specialization: "Optical Fiber & Satellite Communications" },
    ],
    subjects: [
      { name: "Digital Signal Processing", code: "EC201", periods: 3, is_lab: 0 },
      { name: "DSP Hardware Lab", code: "EC201L", periods: 2, is_lab: 1, lab_duration_hours: 2 },
      { name: "VLSI Architecture & Verilog", code: "EC301", periods: 3, is_lab: 0 },
      { name: "VLSI CAD Simulation Lab", code: "EC301L", periods: 2, is_lab: 1, lab_duration_hours: 2 },
      { name: "Wireless Cellular Networks", code: "EC401", periods: 3, is_lab: 0 },
    ],
    classrooms: [
      { name: "LH-203 (ENTC Hall)", capacity: 70, is_lab: 0, location: "Block E, 1st Floor", equipment: "Projector, Audio Setup" },
      { name: "Lab 6 - IoT & Embedded Systems Lab", capacity: 35, is_lab: 1, location: "Block E, 2nd Floor", equipment: "35 FPGA Kits, Digital Oscilloscopes, ARM Boards" },
    ],
  },
  {
    code: "CYBER",
    name: "Cyber Security & Digital Forensics",
    yearNames: ["Second Year (SE)", "Third Year (TE)", "Final Year (BE)"],
    classes: [
      { name: "SE-CYBER-A", year: "Second Year (SE)", capacity: 60, student_count: 58 },
      { name: "TE-CYBER-A", year: "Third Year (TE)", capacity: 60, student_count: 57 },
      { name: "BE-CYBER-A", year: "Final Year (BE)", capacity: 60, student_count: 55 },
    ],
    teachers: [
      { name: "Dr. Jitendra Saxena", email: "jitendra.saxena@institution.edu", specialization: "Ethical Hacking & Penetration Testing" },
      { name: "Prof. Swati Bhat", email: "swati.bhat@institution.edu", specialization: "Malware Analysis & Reverse Engineering" },
      { name: "Dr. Vivek Chawla", email: "vivek.chawla@institution.edu", specialization: "Applied Cryptography & Blockchain Protocols" },
    ],
    subjects: [
      { name: "Ethical Hacking & Defense", code: "CY301", periods: 3, is_lab: 0 },
      { name: "Ethical Hacking Lab", code: "CY301L", periods: 2, is_lab: 1, lab_duration_hours: 2 },
      { name: "Malware Analysis & Forensics", code: "CY302", periods: 3, is_lab: 0 },
      { name: "Applied Cryptography", code: "CY401", periods: 3, is_lab: 0 },
    ],
    classrooms: [
      { name: "LH-403 (Security Hall)", capacity: 70, is_lab: 0, location: "Block C, 3rd Floor", equipment: "Smart Interactive Screen, Sound System" },
      { name: "Lab 7 - SOC Defense & Cyber Range", capacity: 35, is_lab: 1, location: "Block C, 3rd Floor", equipment: "Isolated Cyber Range, Wireshark Packet Inspection Server" },
    ],
  },
  {
    code: "ROB",
    name: "Robotics & Industrial Automation",
    yearNames: ["Second Year (SE)", "Third Year (TE)", "Final Year (BE)"],
    classes: [
      { name: "SE-ROB-A", year: "Second Year (SE)", capacity: 60, student_count: 52 },
      { name: "TE-ROB-A", year: "Third Year (TE)", capacity: 60, student_count: 50 },
      { name: "BE-ROB-A", year: "Final Year (BE)", capacity: 60, student_count: 48 },
    ],
    teachers: [
      { name: "Dr. Chetan Pande", email: "chetan.pande@institution.edu", specialization: "Robot Kinematics & ROS Framework" },
      { name: "Prof. Shruti Dixit", email: "shruti.dixit@institution.edu", specialization: "Industrial Automation & PLC Scada" },
      { name: "Dr. Nikhil Gaikwad", email: "nikhil.gaikwad@institution.edu", specialization: "Autonomous Mobile Robots & SLAM" },
    ],
    subjects: [
      { name: "Industrial Automation & PLC", code: "RO301", periods: 3, is_lab: 0 },
      { name: "Robotics Programming Lab", code: "RO301L", periods: 2, is_lab: 1, lab_duration_hours: 2 },
      { name: "Autonomous Mobile Robotics", code: "RO302", periods: 3, is_lab: 0 },
    ],
    classrooms: [
      { name: "LH-503 (Robotics Hall)", capacity: 60, is_lab: 0, location: "Block F, 1st Floor", equipment: "Projector, Demonstration Arena" },
      { name: "Lab 8 - Robotics Prototyping Lab", capacity: 30, is_lab: 1, location: "Block F, Ground Floor", equipment: "6-Axis Robot Arms, 3D Printers, Siemens PLC Racks" },
    ],
  },
  {
    code: "MECH",
    name: "Mechanical Engineering & Mechatronics",
    yearNames: ["First Year (FE)", "Second Year (SE)", "Third Year (TE)"],
    classes: [
      { name: "FE-MECH-A", year: "First Year (FE)", capacity: 60, student_count: 60 },
      { name: "SE-MECH-A", year: "Second Year (SE)", capacity: 60, student_count: 58 },
      { name: "TE-MECH-A", year: "Third Year (TE)", capacity: 60, student_count: 56 },
    ],
    teachers: [
      { name: "Dr. Anil Shinde", email: "anil.shinde@institution.edu", specialization: "Thermodynamics & Heat Transfer" },
      { name: "Prof. Mahesh Jadhav", email: "mahesh.jadhav@institution.edu", specialization: "CAD/CAM & Finite Element Analysis" },
      { name: "Dr. Rajesh Bhosale", email: "rajesh.bhosale@institution.edu", specialization: "Fluid Power Systems & Hydraulics" },
    ],
    subjects: [
      { name: "Thermodynamics & Heat Transfer", code: "ME201", periods: 3, is_lab: 0 },
      { name: "CAD/CAM Simulation Lab", code: "ME201L", periods: 2, is_lab: 1, lab_duration_hours: 2 },
      { name: "Fluid Mechanics & Machinery", code: "ME202", periods: 3, is_lab: 0 },
    ],
    classrooms: [
      { name: "LH-103 (Mechanical Hall)", capacity: 70, is_lab: 0, location: "Block G, Ground Floor", equipment: "Projector, Drafting Tables" },
      { name: "Lab 9 - CAD/CAM Simulation Center", capacity: 35, is_lab: 1, location: "Block G, 1st Floor", equipment: "35 High-Precision Workstations with SolidWorks/ANSYS" },
    ],
  },
  {
    code: "CSBS",
    name: "Computer Science & Business Systems",
    yearNames: ["First Year (FE)", "Second Year (SE)", "Third Year (TE)"],
    classes: [
      { name: "FE-CSBS-A", year: "First Year (FE)", capacity: 60, student_count: 58 },
      { name: "SE-CSBS-A", year: "Second Year (SE)", capacity: 60, student_count: 56 },
      { name: "TE-CSBS-A", year: "Third Year (TE)", capacity: 60, student_count: 54 },
    ],
    teachers: [
      { name: "Dr. Pallavi Gore", email: "pallavi.gore@institution.edu", specialization: "FinTech & Algorithmic Trading" },
      { name: "Prof. Tarun Sen", email: "tarun.sen@institution.edu", specialization: "Enterprise System Architecture" },
      { name: "Dr. Alok Bhatnagar", email: "alok.bhatnagar@institution.edu", specialization: "Business Intelligence & Predictive Analytics" },
    ],
    subjects: [
      { name: "Financial Engineering & FinTech", code: "CB201", periods: 3, is_lab: 0 },
      { name: "Business Analytics Studio Lab", code: "CB201L", periods: 2, is_lab: 1, lab_duration_hours: 2 },
      { name: "Enterprise Resource Planning", code: "CB301", periods: 3, is_lab: 0 },
    ],
    classrooms: [
      { name: "LH-303 (Business Studio)", capacity: 70, is_lab: 0, location: "Block H, 2nd Floor", equipment: "Dual Displays, Interactive Podium" },
      { name: "Lab 10 - FinTech & Analytics Lab", capacity: 35, is_lab: 1, location: "Block H, 2nd Floor", equipment: "Bloomberg Terminal Access, Data Workstations" },
    ],
  },
];

/**
 * Returns a dynamically synthesized unique department definition if all predefined
 * departments have already been generated in the database.
 */
function generateDynamicDepartment(iterationIndex) {
  const code = `D${iterationIndex}`;
  const name = `Advanced Engineering & Technology (Track ${iterationIndex})`;
  return {
    code,
    name,
    yearNames: ["First Year (FE)", "Second Year (SE)", "Third Year (TE)", "Final Year (BE)"],
    classes: [
      { name: `FE-${code}-A`, year: "First Year (FE)", capacity: 60, student_count: 58 },
      { name: `FE-${code}-B`, year: "First Year (FE)", capacity: 60, student_count: 57 },
      { name: `SE-${code}-A`, year: "Second Year (SE)", capacity: 60, student_count: 56 },
      { name: `TE-${code}-A`, year: "Third Year (TE)", capacity: 60, student_count: 55 },
    ],
    teachers: [
      { name: `Dr. Academic Lead ${iterationIndex}`, email: `lead.${code.toLowerCase()}@institution.edu`, specialization: `Advanced Systems Track ${iterationIndex}` },
      { name: `Prof. Specialist ${iterationIndex}A`, email: `spec.${code.toLowerCase()}a@institution.edu`, specialization: `Specialized Computing ${iterationIndex}` },
      { name: `Prof. Specialist ${iterationIndex}B`, email: `spec.${code.toLowerCase()}b@institution.edu`, specialization: `Applied Analytics ${iterationIndex}` },
    ],
    subjects: [
      { name: `Core Principles of Track ${iterationIndex}`, code: `${code}101`, periods: 3, is_lab: 0 },
      { name: `Track ${iterationIndex} Practical Lab`, code: `${code}101L`, periods: 2, is_lab: 1, lab_duration_hours: 2 },
      { name: `Advanced Methods in Track ${iterationIndex}`, code: `${code}201`, periods: 3, is_lab: 0 },
      { name: `Applied Systems Lab ${iterationIndex}`, code: `${code}201L`, periods: 2, is_lab: 1, lab_duration_hours: 2 },
    ],
    classrooms: [
      { name: `LH-${600 + iterationIndex}`, capacity: 70, is_lab: 0, location: `Engineering Wing ${iterationIndex}`, equipment: "Smart Board, High-Lumen Projector" },
      { name: `Lab ${10 + iterationIndex} - Research Facility`, capacity: 35, is_lab: 1, location: `Wing ${iterationIndex} Lab Complex`, equipment: "Modern High-Performance Compute Workstations" },
    ],
  };
}

/**
 * Merges a brand new batch of unique sample institutional data with EACH invocation.
 * Automatically discovers the next unrepresented department or generates a new track,
 * adding unique classes, faculty, subjects, rooms, assignments, and user accounts.
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
    // 1. Determine which department to generate next based on existing classes
    const existingClasses = db.prepare("SELECT name FROM classes").all().map((c) => c.name);
    
    let deptToGenerate = DEPARTMENTS_CATALOG.find((dept) => {
      // If this department's batch classes have not been added yet, generate this department
      return !dept.classes.some((c) => existingClasses.includes(c.name));
    });

    if (!deptToGenerate) {
      // If all predefined departments exist, generate a unique sequential department track
      let maxTrack = 0;
      for (const name of existingClasses) {
        const match = name.match(/D(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxTrack) maxTrack = num;
        }
      }
      deptToGenerate = generateDynamicDepartment(maxTrack + 1);
    }

    // 2. Ensure Required Academic Years exist
    const yearMap = new Map();
    const existingYears = db.prepare("SELECT id, name FROM years").all();
    existingYears.forEach((y) => yearMap.set(y.name, y.id));

    for (const yearName of deptToGenerate.yearNames) {
      if (!yearMap.has(yearName)) {
        const id = randomUUID();
        db.prepare(
          "INSERT INTO years (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)"
        ).run(id, yearName, now, now);
        yearMap.set(yearName, id);
        addedYears++;
      }
    }

    // 3. Insert Classes
    const classMap = new Map();
    for (const c of deptToGenerate.classes) {
      const existing = db.prepare("SELECT id FROM classes WHERE name = ?").get(c.name);
      if (existing) {
        classMap.set(c.name, existing.id);
      } else {
        const id = randomUUID();
        const yearId = yearMap.get(c.year) || null;
        db.prepare(
          "INSERT INTO classes (id, name, year_id, capacity, student_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(id, c.name, yearId, c.capacity, c.student_count, now, now);
        classMap.set(c.name, id);
        addedClasses++;
      }
    }

    // 4. Insert Classrooms & Labs
    const classroomMap = new Map();
    for (const r of deptToGenerate.classrooms) {
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

    // 5. Insert Teachers & Provision Teacher Accounts
    const teacherMap = new Map();
    for (const t of deptToGenerate.teachers) {
      const existing = db.prepare("SELECT id FROM teachers WHERE email = ?").get(t.email);
      let teacherId;
      if (existing) {
        teacherId = existing.id;
      } else {
        teacherId = randomUUID();
        db.prepare(
          "INSERT INTO teachers (id, name, email, specialization, max_periods_per_day, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(teacherId, t.name, t.email, t.specialization, 4, now, now);
        addedTeachers++;
      }
      teacherMap.set(t.email, teacherId);

      // User account for teacher
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

    // 6. Provision Student Accounts for new classes
    for (const c of deptToGenerate.classes) {
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

    // 7. Insert Subjects
    const subjectMap = new Map();
    for (const s of deptToGenerate.subjects) {
      const existing = db.prepare("SELECT id FROM subjects WHERE code = ?").get(s.code);
      let subjectId;
      if (existing) {
        subjectId = existing.id;
      } else {
        subjectId = randomUUID();
        db.prepare(
          "INSERT INTO subjects (id, name, code, periods_per_week, is_lab, lab_duration_hours, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(subjectId, s.name, s.code, s.periods, s.is_lab, s.lab_duration_hours || 1, now, now);
        addedSubjects++;
      }
      subjectMap.set(s.code, subjectId);
    }

    // 8. Assign Teachers to Subjects
    const teachersList = Array.from(teacherMap.values());
    const subjectsList = Array.from(subjectMap.values());
    for (let i = 0; i < subjectsList.length; i++) {
      const sId = subjectsList[i];
      const tId = teachersList[i % teachersList.length];
      const existing = db.prepare(
        "SELECT id FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_id = ?"
      ).get(tId, sId);
      if (!existing) {
        db.prepare(
          "INSERT INTO teacher_subject_assignments (id, teacher_id, subject_id, created_at) VALUES (?, ?, ?, ?)"
        ).run(randomUUID(), tId, sId, now);
        addedAssignments++;
      }
    }

    // 9. Assign Subjects to Classes
    const classesList = Array.from(classMap.values());
    for (const cId of classesList) {
      for (const sId of subjectsList) {
        const existing = db.prepare(
          "SELECT id FROM subject_class_assignments WHERE subject_id = ? AND class_id = ?"
        ).get(sId, cId);
        if (!existing) {
          db.prepare(
            "INSERT INTO subject_class_assignments (id, subject_id, class_id, created_at) VALUES (?, ?, ?, ?)"
          ).run(randomUUID(), sId, cId, now);
          addedAssignments++;
        }
      }
    }

    // 10. Assign Classrooms to Classes
    const classroomsList = Array.from(classroomMap.values());
    if (classroomsList.length > 0) {
      for (let i = 0; i < classesList.length; i++) {
        const cId = classesList[i];
        const rId = classroomsList[i % classroomsList.length];
        const existing = db.prepare(
          "SELECT id FROM class_classroom_assignments WHERE class_id = ? AND classroom_id = ?"
        ).get(cId, rId);
        if (!existing) {
          db.prepare(
            "INSERT INTO class_classroom_assignments (id, class_id, classroom_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
          ).run(randomUUID(), cId, rId, now, now);
          addedAssignments++;
        }
      }
    }

    return {
      success: true,
      batchName: deptToGenerate.name,
      stats: {
        addedYears,
        addedClasses,
        addedClassrooms,
        addedTeachers,
        addedSubjects,
        addedAssignments,
        addedUsers,
      },
      message: `Generated and merged ${deptToGenerate.name}: ${addedClasses} new classes, ${addedTeachers} faculty, ${addedSubjects} subjects, and ${addedClassrooms} classrooms.`,
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

/**
 * Export full institutional dataset into standardized college_master_import.csv format.
 */
function exportMasterData() {
  const years = db.prepare("SELECT * FROM years").all();
  const yearMap = new Map(years.map((y) => [y.id, y.name]));

  const classes = db.prepare("SELECT * FROM classes ORDER BY name ASC").all();
  const classrooms = db.prepare("SELECT * FROM classrooms ORDER BY name ASC").all();
  const teachers = db.prepare("SELECT * FROM teachers ORDER BY name ASC").all();
  const subjects = db.prepare("SELECT * FROM subjects ORDER BY name ASC").all();

  const subjClassMap = db.prepare("SELECT * FROM subject_class_assignments").all();
  const teacherSubjMap = db.prepare("SELECT * FROM teacher_subject_assignments").all();
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  const rows = [];
  rows.push("Record_Type,Name,Code,Year,Capacity,Credits,Periods_Per_Week,Is_Lab,Lab_Duration_Hours,Email,Specialization,Location,Equipment,Classes,Teachers,Batches");

  function esc(val) {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  // 1. Classes
  for (const c of classes) {
    let batchesStr = "";
    if (c.batches) {
      try {
        const bParsed = typeof c.batches === "string" ? JSON.parse(c.batches) : c.batches;
        if (Array.isArray(bParsed)) {
          batchesStr = bParsed.map((b) => typeof b === "object" ? `${b.name || 'Batch'}: ${b.capacity || 20}` : b).join(", ");
        }
      } catch {}
    }
    rows.push(`CLASS,${esc(c.name)},,${esc(yearMap.get(c.year_id) || "")},${c.student_count || 60},,,No,1,,,,,,,${esc(batchesStr)}`);
  }

  // 2. Classrooms & Labs
  for (const r of classrooms) {
    const isLab = r.is_lab ? "Yes" : "No";
    rows.push(`CLASSROOM,${esc(r.name)},,,${r.capacity || 60},,,${isLab},,,,${esc(r.location || "")},${esc(r.equipment || "")},,,`);
  }

  // 3. Teachers
  for (const t of teachers) {
    rows.push(`TEACHER,${esc(t.name)},,,,,,No,,${esc(t.email || "")},${esc(t.specialization || "")},,,,,`);
  }

  // 4. Subjects
  for (const s of subjects) {
    const assignedClassIds = subjClassMap.filter((sc) => sc.subject_id === s.id).map((sc) => sc.class_id);
    const assignedClassNames = assignedClassIds.map((cid) => classMap.get(cid)?.name).filter(Boolean);

    const assignedTeacherIds = teacherSubjMap.filter((ts) => ts.subject_id === s.id).map((ts) => ts.teacher_id);
    const assignedTeacherNames = Array.from(new Set(assignedTeacherIds.map((tid) => teacherMap.get(tid)?.name).filter(Boolean)));

    const isLab = s.is_lab ? "Yes" : "No";
    const labDur = s.is_lab ? (s.lab_duration_hours || 2) : 1;
    const credits = s.credits || (s.is_lab ? 1 : (s.periods_per_week || 3));
    const periods = s.periods_per_week || (s.is_lab ? 2 : credits);

    rows.push(`SUBJECT,${esc(s.name)},${esc(s.code || "")},,,${credits},${periods},${isLab},${labDur},,,,,${esc(assignedClassNames.join(", "))},${esc(assignedTeacherNames.join(", "))},`);
  }

  return rows.join("\n");
}

module.exports = {
  mergeSampleData,
  killSwitch,
  exportMasterData,
  DEPARTMENTS_CATALOG,
};
