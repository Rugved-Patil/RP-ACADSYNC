// generate_standardized_csvs.js
// Generates standardized CSV files for JNEC MGM University College Data:
// 1. college_import_data/college_master_import.csv (Master all-in-one format)
// 2. college_import_data/1_classes.csv
// 3. college_import_data/2_classrooms_and_labs.csv
// 4. college_import_data/3_teachers.csv
// 5. college_import_data/4_subjects_and_labs.csv
// 6. college_import_data/README.md

const fs = require("fs");
const path = require("path");

const outDir = path.resolve(__dirname, "../college_import_data");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function toCsvRow(arr) {
  return arr.map(val => {
    if (val === undefined || val === null) return "";
    const str = String(val);
    if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }).join(",");
}

// Data definitions
const classes = [
  { name: "SE-ECCE", year: "Second Year (SE)", capacity: 60, student_count: 58 },
  { name: "SE-AIDS", year: "Second Year (SE)", capacity: 60, student_count: 55 },
  { name: "TY-ECCE", year: "Third Year (TY)", capacity: 60, student_count: 56 },
  { name: "TY-AIDS", year: "Third Year (TY)", capacity: 60, student_count: 54 },
  { name: "B.Tech-ECCE", year: "Final Year (B.Tech)", capacity: 60, student_count: 57 },
  { name: "B.Tech-AIDS", year: "Final Year (B.Tech)", capacity: 60, student_count: 56 },
];

const classrooms = [
  // Lecture Halls
  { name: "SF-31", capacity: 70, is_lab: "No", location: "Second Floor SF-31", equipment: "Projector, Audio System, Smart Board" },
  { name: "SF-32", capacity: 70, is_lab: "No", location: "Second Floor SF-32", equipment: "Projector, Audio System" },
  { name: "SF-33", capacity: 70, is_lab: "No", location: "Second Floor SF-33", equipment: "Projector, Audio System, Smart Board" },
  { name: "TF-31", capacity: 70, is_lab: "No", location: "Third Floor TF-31", equipment: "Projector, Audio System" },
  { name: "TF-32", capacity: 70, is_lab: "No", location: "Third Floor TF-32", equipment: "Projector, Audio System" },
  { name: "FF-22", capacity: 60, is_lab: "No", location: "First Floor FF-22", equipment: "Projector" },
  { name: "Jack Kilby Hall", capacity: 120, is_lab: "No", location: "Ground Floor", equipment: "Podium, Dual Projectors, Sound System" },

  // Laboratories (Flagged with Is Lab: Yes)
  { name: "System Software Lab (FF-21)", capacity: 35, is_lab: "Yes", location: "First Floor FF-21", equipment: "35 High-End Linux Workstations, GCC/GDB" },
  { name: "Programming Lab-1 (FF-28)", capacity: 35, is_lab: "Yes", location: "First Floor FF-28", equipment: "35 Systems, Oracle/MySQL, Java/Python" },
  { name: "Programming Lab-2 (FF-28)", capacity: 35, is_lab: "Yes", location: "First Floor FF-28", equipment: "35 Systems, Network Simulator, Wireshark" },
  { name: "Analog Circuit Lab (FF-33)", capacity: 35, is_lab: "Yes", location: "First Floor FF-33", equipment: "DSO, Function Generators, Multimeters, Breadboards" },
  { name: "EDC Lab (FF-34)", capacity: 35, is_lab: "Yes", location: "First Floor FF-34", equipment: "Semiconductor Kits, CRO, Power Supplies" },
  { name: "Communication Lab (FF-36)", capacity: 35, is_lab: "Yes", location: "First Floor FF-36", equipment: "RF Modulators, Optical Fiber Trainers" },
  { name: "DMP Lab (FF-38)", capacity: 35, is_lab: "Yes", location: "First Floor FF-38", equipment: "Microprocessor & 8051 Kits, FPGA Boards" },
  { name: "Data Science Lab-II (FF-40)", capacity: 35, is_lab: "Yes", location: "First Floor FF-40", equipment: "GPU Systems, Jupyter Notebooks, Node.js" },
  { name: "Electronic Workshop Lab (FF-30)", capacity: 35, is_lab: "Yes", location: "First Floor FF-30", equipment: "PCB Milling, Soldering Stations, Basic Electrical" },
];

const teachers = [
  { name: "Dr. S. N. Pawar", email: "snpawar@jnec.ac.in", specialization: "Computer Networks & Wireless Communication", phone: "+91-240-2482893" },
  { name: "Prof. F. I. Shaikh", email: "fishaikh@jnec.ac.in", specialization: "Electronic Devices & Digital Image Processing", phone: "+91-240-2482893" },
  { name: "Dr. V. B. Malode", email: "vbmalode@jnec.ac.in", specialization: "Data Structures & CMOS Design", phone: "+91-240-2482893" },
  { name: "Dr. V. A. More", email: "vamore@jnec.ac.in", specialization: "Analog Circuits & Electrical Engineering", phone: "+91-240-2482893" },
  { name: "Prof. V. A. Kulkarni", email: "vakulkarni@jnec.ac.in", specialization: "Digital System Design & Embedded Systems", phone: "+91-240-2482893" },
  { name: "Prof. S. A. Annadate", email: "saannadate@jnec.ac.in", specialization: "Software Engineering & Image Processing", phone: "+91-240-2482893" },
  { name: "Prof. G. R. Basole", email: "grbasole@jnec.ac.in", specialization: "Automotive Electronics & Community Engagement", phone: "+91-240-2482893" },
  { name: "Prof. A. P. Phatale", email: "apphatale@jnec.ac.in", specialization: "Operating Systems & Databases", phone: "+91-240-2482893" },
  { name: "Prof. A. R. Salunke", email: "arsalunke@jnec.ac.in", specialization: "Computer Networks & Network Security", phone: "+91-240-2482893" },
  { name: "Dr. C. S. Khandelwal", email: "cskhandelwal@jnec.ac.in", specialization: "Database Management & Data Analytics", phone: "+91-240-2482893" },
  { name: "Prof. S. D. Jadhav", email: "sdjadhav@jnec.ac.in", specialization: "Probability & Statistics, Business Management", phone: "+91-240-2482893" },
  { name: "Prof. M. A. Mulay", email: "mamulay@jnec.ac.in", specialization: "Digital Systems & Analog Circuits", phone: "+91-240-2482893" },
  { name: "Dr. S. D. Gavarskar", email: "sdgavarskar@jnec.ac.in", specialization: "Data Structures & Algorithms", phone: "+91-240-2482893" },
  { name: "Prof. M. K. Pawar", email: "mkpawar@jnec.ac.in", specialization: "Data Science & Web Development", phone: "+91-240-2482893" },
  { name: "Prof. P. B. Murmude", email: "pbmurmude@jnec.ac.in", specialization: "Web Development Framework & IoT", phone: "+91-240-2482893" },
  { name: "Prof. A. G. Patil", email: "agpatil@jnec.ac.in", specialization: "Specialized Honors & Systems", phone: "+91-240-2482893" },
  { name: "Prof. P. P. Patil", email: "pppatil@jnec.ac.in", specialization: "Natural Language Processing & AI", phone: "+91-240-2482893" },
  { name: "Prof. V. J. Lipne", email: "vjlipne@jnec.ac.in", specialization: "Artificial Intelligence & Industry Projects", phone: "+91-240-2482893" },
  { name: "Prof. R. L. Mudbe", email: "rlmudbe@jnec.ac.in", specialization: "Engineering Exploration & NCC", phone: "+91-240-2482893" },
];

const subjects = [
  // SE-ECCE
  { name: "Digital System Design (DSD)", code: "EC201", periods: 2, is_lab: "No", lab_dur: 1, classes: "SE-ECCE", teachers: "Prof. M. A. Mulay, Prof. V. A. Kulkarni" },
  { name: "DSD Lab", code: "EC201L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "SE-ECCE", teachers: "Prof. M. A. Mulay" },
  { name: "Data Structures (DS)", code: "EC202", periods: 2, is_lab: "No", lab_dur: 1, classes: "SE-ECCE", teachers: "Dr. V. B. Malode, Dr. S. D. Gavarskar" },
  { name: "DS Lab", code: "EC202L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "SE-ECCE", teachers: "Dr. V. B. Malode, Dr. S. D. Gavarskar" },
  { name: "Electronic Circuits & Network Theory (EC&NT)", code: "EC203", periods: 2, is_lab: "No", lab_dur: 1, classes: "SE-ECCE", teachers: "Dr. V. B. Malode, Prof. F. I. Shaikh" },
  { name: "EC&NT Lab", code: "EC203L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "SE-ECCE", teachers: "Prof. F. I. Shaikh" },
  { name: "Business Management & Financial Accounting (BMFA)", code: "EC204", periods: 2, is_lab: "No", lab_dur: 1, classes: "SE-ECCE", teachers: "Prof. S. D. Jadhav" },
  { name: "Community Engagement", code: "EC205L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "SE-ECCE", teachers: "Prof. G. R. Basole" },
  { name: "Multidisciplinary Minor (MDM)", code: "EC206", periods: 2, is_lab: "No", lab_dur: 1, classes: "SE-ECCE", teachers: "Dr. S. D. Gavarskar" },
  { name: "Constitution of India", code: "EC207", periods: 2, is_lab: "No", lab_dur: 1, classes: "SE-ECCE", teachers: "Prof. G. R. Basole" },

  // SE-AIDS
  { name: "Digital Systems & Microprocessors (DS&MP)", code: "AI201", periods: 2, is_lab: "No", lab_dur: 1, classes: "SE-AIDS", teachers: "Prof. V. A. Kulkarni" },
  { name: "DS&MP Lab", code: "AI201L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "SE-AIDS", teachers: "Prof. V. A. Kulkarni" },
  { name: "Data Structures (AIDS)", code: "AI202", periods: 2, is_lab: "No", lab_dur: 1, classes: "SE-AIDS", teachers: "Dr. S. D. Gavarskar, Dr. V. B. Malode" },
  { name: "DS Lab (AIDS)", code: "AI202L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "SE-AIDS", teachers: "Dr. S. D. Gavarskar, Dr. V. B. Malode" },
  { name: "Probability & Random Processes (PB&RP)", code: "AI203", periods: 2, is_lab: "No", lab_dur: 1, classes: "SE-AIDS", teachers: "Prof. S. D. Jadhav" },
  { name: "Web Development Lab (SE)", code: "AI204L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "SE-AIDS", teachers: "Prof. M. K. Pawar" },
  { name: "BM&FA (AIDS)", code: "AI205", periods: 2, is_lab: "No", lab_dur: 1, classes: "SE-AIDS", teachers: "Prof. S. D. Jadhav" },
  { name: "Community Engagement (AIDS)", code: "AI206L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "SE-AIDS", teachers: "Prof. G. R. Basole" },
  { name: "MDM (AIDS)", code: "AI207", periods: 2, is_lab: "No", lab_dur: 1, classes: "SE-AIDS", teachers: "Dr. C. S. Khandelwal" },
  { name: "Constitution of India (AIDS)", code: "AI208", periods: 2, is_lab: "No", lab_dur: 1, classes: "SE-AIDS", teachers: "Prof. G. R. Basole" },

  // TY-ECCE
  { name: "Computer Networks (ECCE)", code: "EC301", periods: 3, is_lab: "No", lab_dur: 1, classes: "TY-ECCE", teachers: "Prof. A. R. Salunke, Dr. S. N. Pawar" },
  { name: "CN Lab (ECCE)", code: "EC301L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "TY-ECCE", teachers: "Prof. A. R. Salunke" },
  { name: "Operating Systems (ECCE)", code: "EC302", periods: 3, is_lab: "No", lab_dur: 1, classes: "TY-ECCE", teachers: "Prof. A. P. Phatale" },
  { name: "OS Lab (ECCE)", code: "EC302L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "TY-ECCE", teachers: "Prof. A. P. Phatale" },
  { name: "Database Management Systems (ECCE)", code: "EC303", periods: 3, is_lab: "No", lab_dur: 1, classes: "TY-ECCE", teachers: "Dr. C. S. Khandelwal, Prof. A. P. Phatale" },
  { name: "DBMS Lab (ECCE)", code: "EC303L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "TY-ECCE", teachers: "Dr. C. S. Khandelwal" },
  { name: "Analog Communication (AC)", code: "EC304", periods: 3, is_lab: "No", lab_dur: 1, classes: "TY-ECCE", teachers: "Prof. M. A. Mulay, Dr. V. A. More" },
  { name: "AC Lab", code: "EC304L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "TY-ECCE", teachers: "Prof. M. A. Mulay" },
  { name: "PE-I (IoT)", code: "EC305", periods: 3, is_lab: "No", lab_dur: 1, classes: "TY-ECCE", teachers: "Prof. F. I. Shaikh, Prof. P. B. Murmude" },
  { name: "IoT Lab", code: "EC305L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "TY-ECCE", teachers: "Prof. P. B. Murmude" },
  { name: "MDM (TY-ECCE)", code: "EC306", periods: 2, is_lab: "No", lab_dur: 1, classes: "TY-ECCE", teachers: "Prof. P. B. Murmude" },

  // TY-AIDS
  { name: "Computer Networks (TY-AIDS)", code: "AI301", periods: 3, is_lab: "No", lab_dur: 1, classes: "TY-AIDS", teachers: "Prof. A. R. Salunke, Dr. S. N. Pawar" },
  { name: "CN Lab (TY-AIDS)", code: "AI301L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "TY-AIDS", teachers: "Prof. A. R. Salunke" },
  { name: "Operating Systems (TY-AIDS)", code: "AI302", periods: 3, is_lab: "No", lab_dur: 1, classes: "TY-AIDS", teachers: "Prof. A. P. Phatale" },
  { name: "OS Lab (TY-AIDS)", code: "AI302L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "TY-AIDS", teachers: "Prof. A. P. Phatale" },
  { name: "DBMS (TY-AIDS)", code: "AI303", periods: 3, is_lab: "No", lab_dur: 1, classes: "TY-AIDS", teachers: "Dr. C. S. Khandelwal" },
  { name: "DBMS Lab (TY-AIDS)", code: "AI303L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "TY-AIDS", teachers: "Dr. C. S. Khandelwal" },
  { name: "Data Science (TY-AIDS)", code: "AI304", periods: 3, is_lab: "No", lab_dur: 1, classes: "TY-AIDS", teachers: "Prof. M. K. Pawar" },
  { name: "DS Lab (TY-AIDS)", code: "AI304L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "TY-AIDS", teachers: "Prof. M. K. Pawar" },
  { name: "PE-I (TY-AIDS)", code: "AI305", periods: 3, is_lab: "No", lab_dur: 1, classes: "TY-AIDS", teachers: "Prof. V. A. Kulkarni" },
  { name: "MDM (TY-AIDS)", code: "AI306", periods: 2, is_lab: "No", lab_dur: 1, classes: "TY-AIDS", teachers: "Dr. S. D. Gavarskar" },

  // B.Tech-ECCE
  { name: "Digital Signal Processing (DSP)", code: "EC401", periods: 3, is_lab: "No", lab_dur: 1, classes: "B.Tech-ECCE", teachers: "Prof. F. I. Shaikh, Prof. M. A. Mulay" },
  { name: "DSP Lab", code: "EC401L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "B.Tech-ECCE", teachers: "Prof. F. I. Shaikh" },
  { name: "Computer Networks (B.Tech-ECCE)", code: "EC402", periods: 3, is_lab: "No", lab_dur: 1, classes: "B.Tech-ECCE", teachers: "Dr. S. N. Pawar, Prof. S. D. Jadhav" },
  { name: "CN Lab (B.Tech-ECCE)", code: "EC402L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "B.Tech-ECCE", teachers: "Prof. S. D. Jadhav" },
  { name: "Software Engineering (ECCE)", code: "EC403", periods: 3, is_lab: "No", lab_dur: 1, classes: "B.Tech-ECCE", teachers: "Prof. S. A. Annadate" },
  { name: "Software Engineering Lab (ECCE)", code: "EC403L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "B.Tech-ECCE", teachers: "Prof. S. A. Annadate" },
  { name: "PE-III (DIP)", code: "EC404", periods: 3, is_lab: "No", lab_dur: 1, classes: "B.Tech-ECCE", teachers: "Prof. F. I. Shaikh, Prof. S. A. Annadate" },
  { name: "DIP Lab", code: "EC404L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "B.Tech-ECCE", teachers: "Prof. S. A. Annadate" },
  { name: "PE-IV (AI)", code: "EC405", periods: 3, is_lab: "No", lab_dur: 1, classes: "B.Tech-ECCE", teachers: "Prof. V. J. Lipne" },
  { name: "AI Lab (ECCE)", code: "EC405L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "B.Tech-ECCE", teachers: "Prof. V. J. Lipne" },
  { name: "Business Management (ECCE)", code: "EC406", periods: 2, is_lab: "No", lab_dur: 1, classes: "B.Tech-ECCE", teachers: "Prof. S. D. Jadhav" },

  // B.Tech-AIDS
  { name: "Natural Language Processing (NLP)", code: "AI401", periods: 3, is_lab: "No", lab_dur: 1, classes: "B.Tech-AIDS", teachers: "Prof. P. P. Patil" },
  { name: "NLP Lab", code: "AI401L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "B.Tech-AIDS", teachers: "Prof. P. P. Patil" },
  { name: "Computer Networks (B.Tech-AIDS)", code: "AI402", periods: 3, is_lab: "No", lab_dur: 1, classes: "B.Tech-AIDS", teachers: "Dr. S. N. Pawar, Prof. A. R. Salunke" },
  { name: "CN Lab (B.Tech-AIDS)", code: "AI402L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "B.Tech-AIDS", teachers: "Prof. A. R. Salunke" },
  { name: "Software Engineering (AIDS)", code: "AI403", periods: 3, is_lab: "No", lab_dur: 1, classes: "B.Tech-AIDS", teachers: "Prof. S. A. Annadate" },
  { name: "Software Engineering Lab (AIDS)", code: "AI403L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "B.Tech-AIDS", teachers: "Prof. S. A. Annadate" },
  { name: "Web Development (AIDS)", code: "AI404", periods: 3, is_lab: "No", lab_dur: 1, classes: "B.Tech-AIDS", teachers: "Prof. M. K. Pawar, Prof. P. B. Murmude" },
  { name: "Web Development Lab (AIDS)", code: "AI404L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "B.Tech-AIDS", teachers: "Prof. M. K. Pawar" },
  { name: "PE-III (AIDS)", code: "AI405", periods: 3, is_lab: "No", lab_dur: 1, classes: "B.Tech-AIDS", teachers: "Prof. V. J. Lipne, Prof. P. P. Patil" },
  { name: "PE-III Lab (AIDS)", code: "AI405L", periods: 2, is_lab: "Yes", lab_dur: 2, classes: "B.Tech-AIDS", teachers: "Prof. V. J. Lipne" },
  { name: "Business Management (AIDS)", code: "AI406", periods: 2, is_lab: "No", lab_dur: 1, classes: "B.Tech-AIDS", teachers: "Prof. S. D. Jadhav" },
];

// 1. Generate 1_classes.csv
const classesRows = [
  toCsvRow(["Class Name", "Year", "Student Count"]),
  ...classes.map(c => toCsvRow([c.name, c.year, c.student_count]))
];
fs.writeFileSync(path.join(outDir, "1_classes.csv"), classesRows.join("\n"), "utf8");
console.log("✓ Created 1_classes.csv");

// 2. Generate 2_classrooms_and_labs.csv
const classroomRows = [
  toCsvRow(["Classroom Name", "Capacity", "Is Lab", "Location", "Equipment"]),
  ...classrooms.map(r => toCsvRow([r.name, r.capacity, r.is_lab, r.location, r.equipment]))
];
fs.writeFileSync(path.join(outDir, "2_classrooms_and_labs.csv"), classroomRows.join("\n"), "utf8");
console.log("✓ Created 2_classrooms_and_labs.csv");

// 3. Generate 3_teachers.csv
const teacherRows = [
  toCsvRow(["Teacher Name", "Email", "Specialization", "Phone"]),
  ...teachers.map(t => toCsvRow([t.name, t.email, t.specialization, t.phone]))
];
fs.writeFileSync(path.join(outDir, "3_teachers.csv"), teacherRows.join("\n"), "utf8");
console.log("✓ Created 3_teachers.csv");

// 4. Generate 4_subjects_and_labs.csv
const subjectRows = [
  toCsvRow(["Subject Name", "Subject Code", "Periods per Week", "Is Lab", "Lab Duration Hours", "Classes", "Teachers"]),
  ...subjects.map(s => toCsvRow([s.name, s.code, s.periods, s.is_lab, s.lab_dur, s.classes, s.teachers]))
];
fs.writeFileSync(path.join(outDir, "4_subjects_and_labs.csv"), subjectRows.join("\n"), "utf8");
console.log("✓ Created 4_subjects_and_labs.csv");

// 5. Generate college_master_import.csv (Master All-in-One file)
const masterHeader = [
  "Record_Type",
  "Name",
  "Code",
  "Year",
  "Capacity",
  "Credits",
  "Periods_Per_Week",
  "Is_Lab",
  "Lab_Duration_Hours",
  "Email",
  "Specialization",
  "Location",
  "Equipment",
  "Classes",
  "Teachers",
  "Batches"
];

const masterRows = [
  toCsvRow(masterHeader),
  // Classes (with Batches)
  ...classes.map(c => toCsvRow(["CLASS", c.name, "", c.year, c.capacity, "", "", "No", "1", "", "", "", "", "", "", "Batch A: 20, Batch B: 20, Batch C: 19"])),
  // Classrooms
  ...classrooms.map(r => toCsvRow(["CLASSROOM", r.name, "", "", r.capacity, "", "", r.is_lab, "", "", "", r.location, r.equipment, "", "", ""])),
  // Teachers
  ...teachers.map(t => toCsvRow(["TEACHER", t.name, "", "", "", "", "", "No", "", t.email, t.specialization, "", "", "", "", ""])),
  // Subjects (with Credits & Periods)
  ...subjects.map(s => toCsvRow(["SUBJECT", s.name, s.code, "", "", s.periods, s.periods, s.is_lab, s.lab_dur, "", "", "", "", s.classes, s.teachers, ""])),
];

const csvContent = masterRows.join("\n");
fs.writeFileSync(path.join(outDir, "college_master_import.csv"), csvContent, "utf8");

const publicDir = path.resolve(__dirname, "../public");
if (fs.existsSync(publicDir)) {
  fs.writeFileSync(path.join(publicDir, "college_master_import.csv"), csvContent, "utf8");
}
console.log("✓ Created college_master_import.csv (Master All-in-One Format) in college_import_data and public/");

// 6. Generate README.md in college_import_data
const readmeContent = `# JNEC MGM University — Standardized College Import Data

This directory contains standardized, clean CSV files for the Jawaharlal Nehru Engineering College (JNEC) MGM University ECT & AI-DS Department dataset.

## Master All-in-One Import (Recommended)
Use **\`college_master_import.csv\`** to import everything in a single step:
- Automatically creates all Academic Years (\`First Year (FY)\`, \`Second Year (SE)\`, \`Third Year (TY)\`, \`Final Year (B.Tech)\`).
- Provisions all 6 undergraduate classes with 3 distinct student batches (\`Batch A: 20\`, \`Batch B: 20\`, \`Batch C: 19\`).
- Provisions all 16 classrooms: 7 Lecture Halls and 9 specialized laboratories with \`is_lab: 1\`.
- Provisions all 19 Faculty members with email, designation, and subject expertise.
- Provisions all 63 subjects (Theory courses with credits/periods, and 2-Hour Practical Labs with \`is_lab: 1\` and \`lab_duration_hours: 2\`).
- Automatically links all Subject-Class and Teacher-Subject relationships.
- Automatically provisions user accounts for Faculty (\`teacher123\`) and Student class representatives (\`student123\`).
`;
fs.writeFileSync(path.join(outDir, "README.md"), readmeContent, "utf8");
console.log("✓ Created README.md");

console.log("\nAll standardized files created successfully in:", outDir);

