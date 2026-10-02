// db.js — Local SQLite database setup for ACADSYNC.
//
// Persistent SQLite storage at server/data/acadsync.db with WAL mode
// and foreign key constraints enabled.

const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "acadsync.db");

let db;
try {
  // Prefer Node.js 22.5+/26 native built-in SQLite (no C++ toolchain / node-gyp compilation required)
  const { DatabaseSync } = require("node:sqlite");
  const rawDb = new DatabaseSync(DB_PATH);

  const origPrepare = rawDb.prepare.bind(rawDb);
  rawDb.prepare = function (sql) {
    const stmt = origPrepare(sql);
    const origRun = stmt.run.bind(stmt);
    const origGet = stmt.get.bind(stmt);
    const origAll = stmt.all.bind(stmt);

    stmt.run = function (...args) {
      if (args.length === 1 && Array.isArray(args[0])) {
        return origRun(...args[0]);
      }
      return origRun(...args);
    };

    stmt.get = function (...args) {
      if (args.length === 1 && Array.isArray(args[0])) {
        return origGet(...args[0]);
      }
      return origGet(...args);
    };

    stmt.all = function (...args) {
      if (args.length === 1 && Array.isArray(args[0])) {
        return origAll(...args[0]);
      }
      return origAll(...args);
    };

    return stmt;
  };

  rawDb.pragma = function (str) {
    return rawDb.prepare("PRAGMA " + str).all();
  };

  rawDb.transaction = function (fn) {
    return function (...args) {
      rawDb.exec("BEGIN");
      try {
        const res = fn(...args);
        rawDb.exec("COMMIT");
        return res;
      } catch (err) {
        rawDb.exec("ROLLBACK");
        throw err;
      }
    };
  };

  db = rawDb;
} catch (e) {
  // Fallback to better-sqlite3 for Node environments without node:sqlite
  const Database = require("better-sqlite3");
  db = new Database(DB_PATH);
}

db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
db.pragma("foreign_keys = ON");

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS years (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  year_id TEXT REFERENCES years(id) ON DELETE SET NULL,
  capacity INTEGER DEFAULT 30,
  student_count INTEGER DEFAULT 0,
  batches TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  credits INTEGER DEFAULT 3,
  periods_per_week INTEGER DEFAULT 3,
  is_lab INTEGER DEFAULT 0,
  lab_duration_hours INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  specialization TEXT,
  max_periods_per_day INTEGER DEFAULT 6,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS classrooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 30,
  is_lab INTEGER DEFAULT 0,
  location TEXT,
  equipment TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  working_days TEXT DEFAULT '[0,1,2,3,4,5]',
  periods TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS time_slots (
  id TEXT PRIMARY KEY,
  timing_id TEXT REFERENCES timings(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_break INTEGER DEFAULT 0,
  slot_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subject_class_assignments (
  id TEXT PRIMARY KEY,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
  id TEXT PRIMARY KEY,
  teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS class_classroom_assignments (
  id TEXT PRIMARY KEY,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  classroom_id TEXT REFERENCES classrooms(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timetables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  academic_year TEXT,
  year_id TEXT REFERENCES years(id),
  timing_id TEXT REFERENCES timings(id),
  is_active INTEGER DEFAULT 0,
  is_locked INTEGER DEFAULT 0,
  share_token TEXT UNIQUE,
  generated_at TEXT,
  modified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  timetable_id TEXT REFERENCES timetables(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  time_slot_id TEXT REFERENCES time_slots(id),
  class_id TEXT REFERENCES classes(id),
  subject_id TEXT REFERENCES subjects(id),
  teacher_id TEXT REFERENCES teachers(id),
  classroom_id TEXT REFERENCES classrooms(id),
  batch TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timetable_drafts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  academic_year TEXT,
  timing_id TEXT,
  year_id TEXT,
  draft_data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
  teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
  class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS change_requests (
  id TEXT PRIMARY KEY,
  timetable_id TEXT REFERENCES timetables(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE CASCADE,
  teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  current_day INTEGER NOT NULL,
  current_time_slot_id TEXT REFERENCES time_slots(id),
  current_classroom_id TEXT REFERENCES classrooms(id),
  requested_day INTEGER,
  requested_time_slot_id TEXT REFERENCES time_slots(id),
  requested_classroom_id TEXT REFERENCES classrooms(id),
  request_type TEXT NOT NULL CHECK(request_type IN ('time_change', 'room_change', 'reschedule')),
  change_scope TEXT NOT NULL DEFAULT 'temporary' CHECK(change_scope IN ('temporary', 'permanent')),
  effective_date TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schedule_overrides (
  id TEXT PRIMARY KEY,
  timetable_id TEXT REFERENCES timetables(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE CASCADE,
  change_request_id TEXT REFERENCES change_requests(id) ON DELETE SET NULL,
  override_type TEXT NOT NULL CHECK(override_type IN ('temporary', 'permanent')),
  effective_date TEXT,
  day INTEGER NOT NULL,
  time_slot_id TEXT REFERENCES time_slots(id),
  classroom_id TEXT REFERENCES classrooms(id),
  teacher_id TEXT REFERENCES teachers(id),
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);

try {
  db.exec("ALTER TABLE classes ADD COLUMN batches TEXT;");
} catch {}

try {
  db.exec("ALTER TABLE subjects ADD COLUMN credits INTEGER DEFAULT 3;");
} catch {}

try {
  db.exec("ALTER TABLE teacher_subject_assignments ADD COLUMN class_id TEXT REFERENCES classes(id) ON DELETE CASCADE;");
} catch {}

try {
  db.exec("ALTER TABLE lessons ADD COLUMN batch TEXT;");
} catch {}

// ---------------------------------------------------------------------------
// Table metadata used by the generic REST layer (routes.js) so it knows how
// to translate JS values <-> SQLite storage for each table.
// ---------------------------------------------------------------------------
const TABLES = {
  years: { boolCols: [], jsonCols: [] },
  classes: { boolCols: [], jsonCols: ["batches"] },
  subjects: { boolCols: ["is_lab"], jsonCols: [] },
  teachers: { boolCols: [], jsonCols: [] },
  classrooms: { boolCols: ["is_lab"], jsonCols: [] },
  timings: { boolCols: [], jsonCols: ["working_days", "periods"] },
  time_slots: { boolCols: ["is_break"], jsonCols: [] },
  subject_class_assignments: { boolCols: [], jsonCols: [] },
  teacher_subject_assignments: { boolCols: [], jsonCols: [] },
  class_classroom_assignments: { boolCols: [], jsonCols: [] },
  timetables: { boolCols: ["is_active", "is_locked"], jsonCols: [] },
  lessons: { boolCols: [], jsonCols: [] },
  timetable_drafts: { boolCols: [], jsonCols: ["draft_data"] },
  users: { boolCols: [], jsonCols: [] },
  change_requests: { boolCols: [], jsonCols: [] },
  schedule_overrides: { boolCols: ["is_active"], jsonCols: [] },
};

// Attach the real column list for each table (used to validate filter/sort
// params so we never interpolate arbitrary, attacker-controlled column names
// into SQL).
for (const table of Object.keys(TABLES)) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  TABLES[table].columns = cols;
}

function isKnownTable(table) {
  return Object.prototype.hasOwnProperty.call(TABLES, table);
}

// Convert a row coming FROM SQLite into normal JS values (0/1 -> boolean,
// JSON text -> parsed object/array) before it goes out over HTTP.
function fromRow(table, row) {
  if (!row) return row;
  const meta = TABLES[table];
  const out = { ...row };
  if (table === "users") {
    delete out.password_hash;
    delete out.salt;
  }
  for (const col of meta.boolCols) {
    if (col in out) out[col] = !!out[col];
  }
  for (const col of meta.jsonCols) {
    if (out[col] != null && typeof out[col] === "string") {
      try {
        out[col] = JSON.parse(out[col]);
      } catch {
        /* leave as-is if it isn't valid JSON */
      }
    }
  }
  return out;
}

// Convert a JS object coming IN over HTTP into SQLite-storable values
// (boolean -> 0/1, object/array -> JSON text).
function toRow(table, obj) {
  const meta = TABLES[table];
  const out = { ...obj };
  for (const col of meta.boolCols) {
    if (col in out) out[col] = out[col] ? 1 : 0;
  }
  for (const col of meta.jsonCols) {
    if (col in out && out[col] != null && typeof out[col] !== "string") {
      out[col] = JSON.stringify(out[col]);
    }
  }
  return out;
}

module.exports = { db, TABLES, isKnownTable, fromRow, toRow, DB_PATH };
