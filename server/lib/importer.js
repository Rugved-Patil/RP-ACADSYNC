// importer.js — Bulk CSV / Excel import and Master Relational Ingestion engine for ACADSYNC.

const { randomUUID } = require("crypto");
const XLSX = require("xlsx");
const { db } = require("../db");

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------
function parseCSV(content) {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  const parseLine = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else current += char;
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.replace(/"/g, ""));
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]).map((v) => v.replace(/"/g, ""));
    if (values.length >= headers.length) {
      const row = {};
      headers.forEach((h, idx) => (row[h] = values[idx] || ""));
      if (Object.values(row).some((v) => v)) data.push(row);
    }
  }
  return data;
}

function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetNames = workbook.SheetNames;
  const isMasterWorkbook = sheetNames.some((s) => /class|teacher|subject|room|lab/i.test(s));

  if (isMasterWorkbook && sheetNames.length > 1) {
    const combined = [];
    for (const name of sheetNames) {
      const sheet = workbook.Sheets[name];
      const json = XLSX.utils.sheet_to_json(sheet);
      let rType = "SUBJECT";
      if (/class\b|grade/i.test(name)) rType = "CLASS";
      else if (/room|hall|lab/i.test(name)) rType = "CLASSROOM";
      else if (/teacher|facult/i.test(name)) rType = "TEACHER";
      for (const row of json) {
        if (!row.Record_Type && !row["Record Type"] && !row["Type"]) {
          row.Record_Type = rType;
        }
        combined.push(row);
      }
    }
    return combined;
  }

  const sheet = workbook.Sheets[sheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (json.length < 2) return [];

  const headers = json[0];
  const data = [];
  for (let i = 1; i < json.length; i++) {
    const values = json[i];
    const row = {};
    headers.forEach((h, idx) => (row[h] = values[idx] ?? ""));
    if (Object.values(row).some((v) => v !== "")) data.push(row);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Transformers: raw spreadsheet rows -> normalized objects
// ---------------------------------------------------------------------------
const Transform = {
  classes: (rows) =>
    rows
      .map((r) => {
        let batches = ["Batch A", "Batch B", "Batch C"];
        const rawBatches = r["Batches"] || r["batches"] || r["Batch"] || "";
        if (rawBatches) {
          if (typeof rawBatches === "string" && rawBatches.trim().length > 0) {
            const parts = rawBatches.split(/[,;]/).map((b) => b.trim()).filter(Boolean);
            if (parts.length > 0) {
              batches = parts.map((p) => {
                const match = p.match(/^([^:]+)(?::\s*(\d+))?$/);
                if (match) {
                  const name = match[1].trim();
                  const count = match[2] ? parseInt(match[2]) : undefined;
                  return count !== undefined ? { name, count } : name;
                }
                return p;
              });
            }
          }
        }
        return {
          name: r["Class Name"] || r["Name"] || r["name"] || r["Class"] || "",
          year_name: r["Year"] || r["Academic Year"] || "",
          capacity: parseInt(r["Capacity"]) || 60,
          student_count: parseInt(r["Student Count"] || r["Capacity"]) || 60,
          batches: batches,
        };
      })
      .filter((r) => r.name),

  teachers: (rows) =>
    rows
      .map((r) => ({
        name: r["Teacher Name"] || r["Name"] || r["name"] || "",
        email: r["Email"] || r["email"] || "",
        phone: r["Phone"] || r["phone"] || "",
        specialization: r["Specialization"] || r["Subject"] || r["specialization"] || "",
        subjects: r["Subjects"] ? String(r["Subjects"]).split(",").map((s) => s.trim()) : [],
      }))
      .filter((r) => r.name && r.email),

  subjects: (rows) =>
    rows
      .map((r) => {
        const isLab = ["true", "1", "yes", "lab"].some((v) =>
          String(r["Is_Lab"] || r["Is Lab"] || r["Type"] || "").toLowerCase().includes(v)
        );
        const labDur = parseInt(r["Lab_Duration_Hours"] || r["Lab Duration Hours"] || r["Lab Duration"] || r["Duration"]) || (isLab ? 2 : 1);
        const credits = parseInt(r["Credits"] || r["Credit"] || r["credits"] || r["Periods_Per_Week"] || r["Periods per Week"] || (isLab ? 1 : 3)) || (isLab ? 1 : 3);
        const periodsPerWeek = isLab ? credits : (parseInt(r["Periods_Per_Week"] || r["Periods per Week"] || r["Periods"]) || credits);
        
        return {
          name: r["Subject Name"] || r["Name"] || r["name"] || "",
          code: r["Subject Code"] || r["Code"] || r["code"] || "",
          credits: credits,
          periods_per_week: periodsPerWeek,
          is_lab: isLab,
          lab_duration_hours: labDur,
          classes: r["Classes"] ? String(r["Classes"]).split(",").map((c) => c.trim()).filter(Boolean) : [],
          teachers: r["Teachers"] ? String(r["Teachers"]).trim() : "",
        };
      })
      .filter((r) => r.name && r.code),

  classrooms: (rows) =>
    rows
      .map((r) => ({
        name: r["Classroom Name"] || r["Name"] || r["name"] || "",
        capacity: parseInt(r["Capacity"]) || 30,
        is_lab: ["true", "1", "yes", "lab"].some((v) =>
          String(r["Is_Lab"] || r["Is Lab"] || r["Type"] || "").toLowerCase().includes(v)
        ),
        location: r["Location"] || r["location"] || "",
        equipment: r["Equipment"] || r["equipment"] || "",
      }))
      .filter((r) => r.name),

  timings: (rows) => {
    const groups = {};
    rows.forEach((r) => {
      const timingName = r["Timing Name"] || r["Schedule"] || "Default Schedule";
      if (!groups[timingName]) groups[timingName] = [];
      groups[timingName].push({
        start_time: r["Start Time"] || r["start_time"] || "",
        end_time: r["End Time"] || r["end_time"] || "",
        is_break: String(r["Is Break"] || r["Type"] || "").toLowerCase().includes("break"),
        slot_order: groups[timingName].length + 1,
      });
    });
    return Object.entries(groups).map(([name, periods]) => ({ name, periods }));
  },

  master: (rows) => {
    const classRows = [];
    const roomRows = [];
    const teacherRows = [];
    const subjectRows = [];

    for (const r of rows) {
      const type = String(r["Record_Type"] || r["Record Type"] || r["Entity Type"] || r["Type"] || "").toUpperCase().trim();
      if (type === "CLASS" || type === "CLASSES") {
        classRows.push(r);
      } else if (type === "CLASSROOM" || type === "CLASSROOMS" || type === "LAB" || type === "ROOM") {
        roomRows.push(r);
      } else if (type === "TEACHER" || type === "TEACHERS" || type === "FACULTY") {
        teacherRows.push(r);
      } else if (type === "SUBJECT" || type === "SUBJECTS") {
        subjectRows.push(r);
      } else {
        // Fallback heuristics based on present fields
        if (r["Classes"] || r["Subject Code"] || r["Code"]) {
          subjectRows.push(r);
        } else if (r["Email"] || r["Specialization"]) {
          teacherRows.push(r);
        } else if (r["Year"] || r["Student Count"]) {
          classRows.push(r);
        } else if (r["Equipment"] || r["Location"]) {
          roomRows.push(r);
        }
      }
    }

    return {
      classes: Transform.classes(classRows),
      classrooms: Transform.classrooms(roomRows),
      teachers: Transform.teachers(teacherRows),
      subjects: Transform.subjects(subjectRows),
    };
  },
};

// ---------------------------------------------------------------------------
// DB operations
// ---------------------------------------------------------------------------
function upsertReturning(table, columns, conflictCol, row) {
  const now = new Date().toISOString();
  const existing = db.prepare(`SELECT id FROM "${table}" WHERE "${conflictCol}" = ?`).get(row[conflictCol]);
  if (existing) {
    const setCols = columns.filter((c) => c !== conflictCol);
    const setSql = setCols.map((c) => `"${c}" = ?`).join(", ") + `, updated_at = ?`;
    db.prepare(`UPDATE "${table}" SET ${setSql} WHERE id = ?`).run(
      ...setCols.map((c) => row[c]),
      now,
      existing.id
    );
    return existing.id;
  }
  const id = randomUUID();
  const cols = ["id", ...columns, "created_at", "updated_at"];
  const placeholders = cols.map(() => "?").join(", ");
  db.prepare(`INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders})`).run(
    id,
    ...columns.map((c) => row[c]),
    now,
    now
  );
  return id;
}

const Insert = {
  classes(rows) {
    const yearIds = {};
    const uniqueYears = [...new Set(rows.map((r) => r.year_name).filter(Boolean))];
    for (const yearName of uniqueYears) {
      let year = db.prepare("SELECT id FROM years WHERE name = ?").get(yearName);
      if (!year) {
        const id = randomUUID();
        const now = new Date().toISOString();
        db.prepare("INSERT INTO years (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, yearName, now, now);
        year = { id };
      }
      yearIds[yearName] = year.id;
    }
    let count = 0;
    for (const r of rows) {
      upsertReturning("classes", ["name", "year_id", "student_count", "capacity", "batches"], "name", {
        name: r.name,
        year_id: r.year_name ? yearIds[r.year_name] : null,
        student_count: r.student_count,
        capacity: r.capacity || 60,
        batches: JSON.stringify(r.batches || ["Batch A", "Batch B", "Batch C"]),
      });
      count++;
    }
    return `Inserted/updated ${count} classes`;
  },

  teachers(rows) {
    let count = 0;
    for (const r of rows) {
      const id = upsertReturning("teachers", ["name", "email", "specialization"], "email", {
        name: r.name,
        email: r.email,
        specialization: r.specialization,
      });
      if (r.subjects && r.subjects.length > 0) {
        const placeholders = r.subjects.map(() => "?").join(",");
        const matchedSubjects = db
          .prepare(`SELECT id FROM subjects WHERE name IN (${placeholders})`)
          .all(...r.subjects);
        for (const subj of matchedSubjects) {
          const exists = db
            .prepare("SELECT id FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_id = ? AND class_id IS NULL")
            .get(id, subj.id);
          if (!exists) {
            db.prepare(
              "INSERT INTO teacher_subject_assignments (id, teacher_id, subject_id, created_at) VALUES (?, ?, ?, ?)"
            ).run(randomUUID(), id, subj.id, new Date().toISOString());
          }
        }
      }
      count++;
    }
    return `Inserted/updated ${count} teachers`;
  },

  subjects(rows) {
    let count = 0;
    for (const r of rows) {
      const id = upsertReturning(
        "subjects",
        ["name", "code", "credits", "periods_per_week", "is_lab", "lab_duration_hours"],
        "code",
        {
          name: r.name,
          code: r.code,
          credits: r.credits || (r.is_lab ? 1 : 3),
          periods_per_week: r.periods_per_week || (r.is_lab ? 1 : 3),
          is_lab: r.is_lab ? 1 : 0,
          lab_duration_hours: r.lab_duration_hours || (r.is_lab ? 2 : 1),
        }
      );

      const assignedClassIds = [];
      if (r.classes && r.classes.length > 0) {
        const placeholders = r.classes.map(() => "?").join(",");
        const matchedClasses = db
          .prepare(`SELECT id, name FROM classes WHERE name IN (${placeholders})`)
          .all(...r.classes);
        for (const cls of matchedClasses) {
          assignedClassIds.push(cls);
          const exists = db
            .prepare("SELECT id FROM subject_class_assignments WHERE subject_id = ? AND class_id = ?")
            .get(id, cls.id);
          if (!exists) {
            db.prepare(
              "INSERT INTO subject_class_assignments (id, subject_id, class_id, created_at) VALUES (?, ?, ?, ?)"
            ).run(randomUUID(), id, cls.id, new Date().toISOString());
          }
        }
      }

      if (r.teachers && r.teachers.length > 0) {
        // Check if teacher field contains class-specific mappings e.g. "SE-ECCE: Prof. M. A. Mulay; SE-AIDS: Prof. V. A. Kulkarni"
        const teacherStr = r.teachers;
        if (teacherStr.includes(":") && teacherStr.includes(";")) {
          const classTeacherPairs = teacherStr.split(";").map((p) => p.trim()).filter(Boolean);
          for (const pair of classTeacherPairs) {
            const [cName, tNames] = pair.split(":").map((s) => s.trim());
            const targetClass = db.prepare("SELECT id FROM classes WHERE name = ?").get(cName);
            const teacherList = tNames ? tNames.split(",").map((s) => s.trim()).filter(Boolean) : [];
            for (const tName of teacherList) {
              const teacherObj = db.prepare("SELECT id FROM teachers WHERE name = ?").get(tName);
              if (teacherObj) {
                const exists = db
                  .prepare("SELECT id FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_id = ? AND class_id = ?")
                  .get(teacherObj.id, id, targetClass?.id || null);
                if (!exists) {
                  db.prepare(
                    "INSERT INTO teacher_subject_assignments (id, teacher_id, subject_id, class_id, created_at) VALUES (?, ?, ?, ?, ?)"
                  ).run(randomUUID(), teacherObj.id, id, targetClass?.id || null, new Date().toISOString());
                }
              }
            }
          }
        } else {
          // Comma-separated list of teacher names
          const teacherNames = teacherStr.split(",").map((t) => t.trim()).filter(Boolean);
          for (const tName of teacherNames) {
            const teacherObj = db.prepare("SELECT id FROM teachers WHERE name = ?").get(tName);
            if (teacherObj) {
              if (assignedClassIds.length > 0) {
                for (const cls of assignedClassIds) {
                  const exists = db
                    .prepare("SELECT id FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_id = ? AND class_id = ?")
                    .get(teacherObj.id, id, cls.id);
                  if (!exists) {
                    db.prepare(
                      "INSERT INTO teacher_subject_assignments (id, teacher_id, subject_id, class_id, created_at) VALUES (?, ?, ?, ?, ?)"
                    ).run(randomUUID(), teacherObj.id, id, cls.id, new Date().toISOString());
                  }
                }
              } else {
                const exists = db
                  .prepare("SELECT id FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_id = ?")
                  .get(teacherObj.id, id);
                if (!exists) {
                  db.prepare(
                    "INSERT INTO teacher_subject_assignments (id, teacher_id, subject_id, created_at) VALUES (?, ?, ?, ?)"
                  ).run(randomUUID(), teacherObj.id, id, new Date().toISOString());
                }
              }
            }
          }
        }
      }
      count++;
    }
    return `Inserted/updated ${count} subjects`;
  },

  classrooms(rows) {
    let count = 0;
    for (const r of rows) {
      upsertReturning("classrooms", ["name", "capacity", "is_lab", "location", "equipment"], "name", {
        name: r.name,
        capacity: r.capacity,
        is_lab: r.is_lab ? 1 : 0,
        location: r.location,
        equipment: r.equipment,
      });
      count++;
    }
    return `Inserted/updated ${count} classrooms`;
  },

  timings(rows) {
    let totalSlots = 0;
    for (const timing of rows) {
      const id = upsertReturning("timings", ["name", "periods", "working_days"], "name", {
        name: timing.name,
        periods: JSON.stringify(timing.periods),
        working_days: JSON.stringify([0, 1, 2, 3, 4, 5]),
      });
      // Replace this timing's slots entirely with the freshly imported ones.
      db.prepare("DELETE FROM time_slots WHERE timing_id = ?").run(id);
      const now = new Date().toISOString();
      const insertSlot = db.prepare(
        `INSERT INTO time_slots (id, timing_id, start_time, end_time, is_break, slot_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      timing.periods.forEach((p) => {
        insertSlot.run(randomUUID(), id, p.start_time, p.end_time, p.is_break ? 1 : 0, p.slot_order, now, now);
        totalSlots++;
      });
    }
    return `Inserted ${rows.length} timing schedule(s) with ${totalSlots} time slots`;
  },

  master(data) {
    const { createUser } = require("./auth");

    // Ensure default 10:00 - 17:00 standard academic timing exists if no timing present
    const existingTiming = db.prepare("SELECT id FROM timings LIMIT 1").get();
    if (!existingTiming) {
      const timingId = randomUUID();
      const now = new Date().toISOString();
      const defaultSlots = [
        { start_time: "10:00", end_time: "11:00", is_break: 0, slot_order: 1 },
        { start_time: "11:00", end_time: "12:00", is_break: 0, slot_order: 2 },
        { start_time: "12:00", end_time: "12:45", is_break: 1, slot_order: 3 },
        { start_time: "12:45", end_time: "13:45", is_break: 0, slot_order: 4 },
        { start_time: "13:45", end_time: "14:45", is_break: 0, slot_order: 5 },
        { start_time: "14:45", end_time: "15:00", is_break: 1, slot_order: 6 },
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
    }

    Insert.classes(data.classes);
    Insert.classrooms(data.classrooms);
    Insert.teachers(data.teachers);
    Insert.subjects(data.subjects);

    // Auto-map default non-lab classrooms to classes if available
    const nonLabRooms = db.prepare("SELECT id FROM classrooms WHERE is_lab = 0 ORDER BY created_at ASC").all();
    const allClasses = db.prepare("SELECT id, name FROM classes ORDER BY created_at ASC").all();
    if (nonLabRooms.length > 0) {
      const now = new Date().toISOString();
      allClasses.forEach((cls, idx) => {
        const assigned = db.prepare("SELECT id FROM class_classroom_assignments WHERE class_id = ?").get(cls.id);
        if (!assigned) {
          const room = nonLabRooms[idx % nonLabRooms.length];
          db.prepare(
            "INSERT INTO class_classroom_assignments (id, class_id, classroom_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
          ).run(randomUUID(), cls.id, room.id, now, now);
        }
      });
    }

    // Auto-provision user logins for teachers and students
    const allTeachers = db.prepare("SELECT id, name, email FROM teachers").all();
    let usersCreated = 0;
    allTeachers.forEach((t) => {
      const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(t.email);
      if (!existing && t.email) {
        createUser({
          name: t.name,
          email: t.email,
          password: "teacher123",
          role: "teacher",
          teacher_id: t.id,
        });
        usersCreated++;
      }
    });

    allClasses.forEach((c) => {
      const classSlug = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const studentEmail = `student.${classSlug}@jnec.ac.in`;
      const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(studentEmail);
      if (!existing) {
        createUser({
          name: `${c.name} Representative`,
          email: studentEmail,
          password: "student123",
          role: "student",
          class_id: c.id,
        });
        usersCreated++;
      }
    });

    return `Master import complete: ${data.classes.length} classes, ${data.classrooms.length} classrooms/labs, ${data.teachers.length} teachers, ${data.subjects.length} subjects & labs. ${usersCreated} user accounts provisioned.`;
  },
};

// ---------------------------------------------------------------------------
function importData({ file, fileName, dataType, mimeType }) {
  const buffer = Buffer.from(file, "base64");

  let parsed;
  if (mimeType?.includes("csv") || fileName.endsWith(".csv")) {
    parsed = parseCSV(buffer.toString("utf-8"));
  } else if (mimeType?.includes("sheet") || fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    parsed = parseExcel(buffer);
  } else if (mimeType?.includes("pdf") || fileName.endsWith(".pdf")) {
    throw new Error(
      "PDF import isn't supported in the local version. Please export your data as CSV or Excel (.xlsx) instead."
    );
  } else {
    throw new Error("Unsupported file format. Please use CSV or Excel (.xlsx/.xls) files.");
  }

  if (!parsed || parsed.length === 0) {
    throw new Error("No data found in file. Please ensure it has proper column headers.");
  }

  // Auto-detect master import format if Record_Type or Record Type column exists
  if (dataType !== "master" && parsed.length > 0) {
    const firstRow = parsed[0];
    const hasRecordType = Object.keys(firstRow).some((k) =>
      /record_type|record type|entity_type|entity type/i.test(k)
    );
    if (hasRecordType) {
      dataType = "master";
    }
  }

  if (!Transform[dataType] || !Insert[dataType]) {
    throw new Error(`Unsupported data type: ${dataType}`);
  }

  const transformed = Transform[dataType](parsed);
  const summary = Insert[dataType](transformed);
  return { success: true, summary, rowsProcessed: parsed.length };
}

module.exports = { importData };
