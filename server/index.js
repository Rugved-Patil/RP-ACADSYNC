// index.js — ACADSYNC local API server.
//
// Run with `npm run dev` (or `node index.js`) from inside server/. Listens
// on PORT (default 4000). The Vite dev server proxies /api requests here
// (see ../vite.config.ts) so the frontend just calls fetch("/api/...").

const express = require("express");
const cors = require("cors");

const { db } = require("./db");
const { registerGenericTableRoutes } = require("./lib/genericTable");
const { generateTimetable } = require("./lib/generator");
const { importData } = require("./lib/importer");
const { exportTimetable } = require("./lib/exporter");
const { shareTimetable } = require("./lib/sharer");
const {
  createUser,
  authenticate,
  getUserById,
  requireAuth,
  requireRole,
  sanitizeUser,
} = require("./lib/auth");
const {
  calculateFreeSlots,
  createChangeRequest,
  reviewChangeRequest,
  promoteOverrideToPermanent,
  listEnrichedRequests,
} = require("./lib/requests");
const { mergeSampleData, killSwitch } = require("./lib/adminData");

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" })); // generous limit: CSV/Excel imports arrive as base64 in the JSON body

app.get("/api/health", (req, res) => res.json({ ok: true }));

// -- Auth Routes (v2.0.0 Section 7.1 & 7.2) --------------------------------
app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = authenticate(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  try {
    const user = getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/users", requireAuth, requireRole("admin"), (req, res) => {
  try {
    const user = createUser(req.body || {});
    res.status(201).json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/auth/users", requireAuth, requireRole("admin"), (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
    const data = rows.map((r) => sanitizeUser(r));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -- Administration Data Management (Section 6.7 & Admin Tools) -------------
app.post("/api/admin/merge-sample-data", requireAuth, requireRole("admin"), (req, res) => {
  try {
    const result = mergeSampleData();
    res.json(result);
  } catch (err) {
    console.error("merge-sample-data failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/kill-switch", requireAuth, requireRole("admin"), (req, res) => {
  try {
    const { confirmation } = req.body || {};
    if (confirmation !== "DELETE ALL DATA") {
      return res.status(400).json({
        error: "Invalid confirmation string. Please type 'DELETE ALL DATA' to confirm.",
      });
    }
    const result = killSwitch(req.user.id);
    res.json(result);
  } catch (err) {
    console.error("kill-switch failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// -- Teacher Change Requests & Schedule Overrides (v2.0.0 Section 7.3 & 7.5) -
app.post("/api/functions/calculate-free-slots", (req, res) => {
  try {
    const result = calculateFreeSlots(req.body || {});
    res.json(result);
  } catch (err) {
    console.error("calculate-free-slots failed:", err.message);
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/requests", requireAuth, (req, res) => {
  try {
    const teacherId = req.user.role === "teacher" ? req.user.teacher_id : req.query.teacher_id;
    const { timetable_id, status } = req.query;
    const requests = listEnrichedRequests({
      timetableId: timetable_id,
      teacherId,
      status,
    });
    res.json({ data: requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/requests", requireAuth, requireRole("admin", "teacher"), (req, res) => {
  try {
    const payload = { ...req.body };
    if (req.user.role === "teacher") {
      payload.teacherId = req.user.teacher_id;
    }
    const created = createChangeRequest(payload);
    res.status(201).json({ request: created });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/requests/:id/review", requireAuth, requireRole("admin"), (req, res) => {
  try {
    const { action, adminNotes } = req.body || {};
    const result = reviewChangeRequest({
      requestId: req.params.id,
      reviewerId: req.user.id,
      action,
      adminNotes,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/overrides/:id/promote", requireAuth, requireRole("admin"), (req, res) => {
  try {
    const override = promoteOverrideToPermanent(req.params.id);
    res.json({ override });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Generic CRUD for every whitelisted table (years, classes, subjects,
// teachers, classrooms, timings, time_slots, *_assignments, timetables,
// lessons, timetable_drafts). See server/lib/genericTable.js.
registerGenericTableRoutes(app);

// -- Functions (replace the old Supabase Edge Functions) --------------------

app.post("/api/functions/generate-timetable", (req, res) => {
  try {
    const result = generateTimetable(req.body || {});
    res.json(result);
  } catch (err) {
    console.error("generate-timetable failed:", err.message);
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/functions/import-data", (req, res) => {
  try {
    const result = importData(req.body || {});
    res.json(result);
  } catch (err) {
    console.error("import-data failed:", err.message);
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/functions/share-timetable", (req, res) => {
  try {
    const { shareToken, format } = req.body || {};
    if (!shareToken) return res.status(400).json({ error: "Share token required" });
    const result = shareTimetable(shareToken, format || "json");
    if (!result) return res.status(404).json({ error: "Timetable not found" });
    res.json(result);
  } catch (err) {
    console.error("share-timetable failed:", err.message);
    res.status(400).json({ error: err.message });
  }
});

// GET so it can be hit as a plain download link, matching the old behavior.
// Also supports role-filtered downloads for teachers and students (Section 7.4).
app.get("/api/download-timetable", (req, res) => {
  try {
    const { id, format = "csv", day, token: queryToken, teacher_id, class_id } = req.query;
    if (!id) return res.status(400).json({ error: "Timetable id required" });

    let filter = {};
    const token =
      req.headers.authorization && req.headers.authorization.startsWith("Bearer ")
        ? req.headers.authorization.slice(7).trim()
        : queryToken;

    if (token) {
      try {
        const { verifyToken } = require("./lib/auth");
        const user = verifyToken(token);
        if (user.role === "teacher" && user.teacher_id) {
          filter.teacher_id = user.teacher_id;
        } else if (user.role === "student" && user.class_id) {
          filter.class_id = user.class_id;
        }
      } catch {
        /* proceed unconstrained if token invalid or absent */
      }
    }

    if (teacher_id) filter.teacher_id = teacher_id;
    if (class_id) filter.class_id = class_id;

    const file = exportTimetable(id, format, day, filter);
    if (!file) return res.status(404).json({ error: "Timetable not found" });
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.send(file.body);
  } catch (err) {
    console.error("download-timetable failed:", err.message);
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`ACADSYNC local API server running on http://localhost:${PORT}`);
});
