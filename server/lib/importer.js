// importer.js — bulk CSV / Excel import, ported from
// supabase/functions/import-data (Deno edge function).
//
// Behavior change vs. the original: PDF import has been dropped. It was a
// best-effort text-scraping heuristic that rarely produced usable tables;
// CSV and Excel cover the same ground far more reliably. If you need it
// back, the old heuristic is still visible in supabase/functions/import-data
// in git history.

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
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
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
      .map((r) => ({
        name: r["Class Name"] || r["name"] || r["Class"] || "",
        year_name: r["Year"] || r["Academic Year"] || "",
        student_count: parseInt(r["Student Count"]) || 0,
      }))
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
      .map((r) => ({
        name: r["Subject Name"] || r["Name"] || r["name"] || "",
        code: r["Subject Code"] || r["Code"] || r["code"] || "",
        periods_per_week: parseInt(r["Periods per Week"]) || parseInt(r["Periods"]) || 1,
        is_lab: ["true", "1", "yes", "lab"].some((v) =>
          String(r["Is Lab"] || r["Type"] || "").toLowerCase().includes(v)
        ),
        classes: r["Classes"] ? String(r["Classes"]).split(",").map((c) => c.trim()) : [],
      }))
      .filter((r) => r.name && r.code),

  classrooms: (rows) =>
    rows
      .map((r) => ({
        name: r["Classroom Name"] || r["Name"] || r["name"] || "",
        capacity: parseInt(r["Capacity"]) || 30,
        is_lab: ["true", "1", "yes", "lab"].some((v) =>
          String(r["Is Lab"] || r["Type"] || "").toLowerCase().includes(v)
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
      upsertReturning("classes", ["name", "year_id", "student_count"], "name", {
        name: r.name,
        year_id: r.year_name ? yearIds[r.year_name] : null,
        student_count: r.student_count,
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
            .prepare("SELECT id FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_id = ?")
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
      const id = upsertReturning("subjects", ["name", "code", "periods_per_week", "is_lab"], "code", {
        name: r.name,
        code: r.code,
        periods_per_week: r.periods_per_week,
        is_lab: r.is_lab ? 1 : 0,
      });
      if (r.classes && r.classes.length > 0) {
        const placeholders = r.classes.map(() => "?").join(",");
        const matchedClasses = db
          .prepare(`SELECT id FROM classes WHERE name IN (${placeholders})`)
          .all(...r.classes);
        for (const cls of matchedClasses) {
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

  if (!Transform[dataType] || !Insert[dataType]) {
    throw new Error(`Unsupported data type: ${dataType}`);
  }

  const transformed = Transform[dataType](parsed);
  const summary = Insert[dataType](transformed);
  return { success: true, summary, rowsProcessed: parsed.length };
}

module.exports = { importData };
