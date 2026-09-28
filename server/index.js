// index.js — ACADSYNC local API server.
//
// Run with `npm run dev` (or `node index.js`) from inside server/. Listens
// on PORT (default 4000). The Vite dev server proxies /api requests here
// (see ../vite.config.ts) so the frontend just calls fetch("/api/...").

const express = require("express");
const cors = require("cors");

const { registerGenericTableRoutes } = require("./lib/genericTable");
const { generateTimetable } = require("./lib/generator");
const { importData } = require("./lib/importer");
const { exportTimetable } = require("./lib/exporter");
const { shareTimetable } = require("./lib/sharer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" })); // generous limit: CSV/Excel imports arrive as base64 in the JSON body

app.get("/api/health", (req, res) => res.json({ ok: true }));

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
app.get("/api/download-timetable", (req, res) => {
  try {
    const { id, format = "csv", day } = req.query;
    if (!id) return res.status(400).json({ error: "Timetable id required" });
    const file = exportTimetable(id, format, day);
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
