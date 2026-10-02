// genericTable.js — Generic REST API layer over SQLite tables (list / insert / update / delete).

const { randomUUID } = require("crypto");
const { db, TABLES, isKnownTable, fromRow, toRow } = require("../db");
const { verifyToken } = require("./auth");

function getAuthUser(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      return verifyToken(authHeader.slice(7).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function parseOrder(orderParam, columns) {
  const entries = Array.isArray(orderParam) ? orderParam : [orderParam];
  const clauses = [];
  for (const entry of entries) {
    if (!entry) continue;
    const [colRaw, dirRaw] = String(entry).split(".");
    const col = colRaw.trim();
    if (!columns.includes(col)) continue;
    const dir = (dirRaw || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";
    clauses.push(`"${col}" ${dir}`);
  }
  return clauses;
}

function parseFilters(query, columns) {
  const eqFilters = [];
  const inFilters = [];
  for (const [key, value] of Object.entries(query)) {
    if (["order", "limit", "select"].includes(key)) continue;
    if (key.endsWith("__in")) {
      const col = key.slice(0, -"__in".length);
      if (!columns.includes(col)) continue;
      const values = String(value).split(",").filter((v) => v.length > 0);
      if (values.length > 0) inFilters.push({ col, values });
    } else {
      if (!columns.includes(key)) continue;
      eqFilters.push({ col: key, value });
    }
  }
  return { eqFilters, inFilters };
}

function buildWhere(eqFilters, inFilters) {
  const clauses = [];
  const params = [];
  for (const f of eqFilters) {
    clauses.push(`"${f.col}" = ?`);
    params.push(f.value);
  }
  for (const f of inFilters) {
    clauses.push(`"${f.col}" IN (${f.values.map(() => "?").join(",")})`);
    params.push(...f.values);
  }
  return {
    sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

function registerGenericTableRoutes(app) {
  // LIST -------------------------------------------------------------------
  app.get("/api/table/:table", (req, res) => {
    const { table } = req.params;
    if (!isKnownTable(table)) return res.status(404).json({ error: `Unknown table "${table}"` });

    const meta = TABLES[table];
    const { eqFilters, inFilters } = parseFilters(req.query, meta.columns);

    // Role-filtered timetable views (Scope Document Section 7.4)
    const authUser = getAuthUser(req);
    if (table === "lessons" && authUser) {
      if (authUser.role === "teacher" && authUser.teacher_id) {
        eqFilters.push({ col: "teacher_id", value: authUser.teacher_id });
      } else if (authUser.role === "student" && authUser.class_id) {
        eqFilters.push({ col: "class_id", value: authUser.class_id });
      }
    }

    const { sql: whereSql, params } = buildWhere(eqFilters, inFilters);

    let selectCols = "*";
    if (req.query.select && req.query.select !== "*") {
      const cols = String(req.query.select)
        .split(",")
        .map((c) => c.trim())
        .filter((c) => meta.columns.includes(c));
      if (cols.length) selectCols = cols.map((c) => `"${c}"`).join(", ");
    }

    const orderClauses = parseOrder(req.query.order, meta.columns);
    const orderSql = orderClauses.length ? `ORDER BY ${orderClauses.join(", ")}` : "";
    const limitSql = req.query.limit ? `LIMIT ${parseInt(req.query.limit, 10) || 0}` : "";

    const sql = `SELECT ${selectCols} FROM "${table}" ${whereSql} ${orderSql} ${limitSql}`;
    try {
      const rows = db.prepare(sql).all(...params);
      res.json(rows.map((r) => fromRow(table, r)));
    } catch (err) {
      console.error(`GET /api/table/${table} failed:`, err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // INSERT -------------------------------------------------------------------
  app.post("/api/table/:table", (req, res) => {
    const { table } = req.params;
    if (!isKnownTable(table)) return res.status(404).json({ error: `Unknown table "${table}"` });

    const authUser = getAuthUser(req);
    if (authUser && authUser.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Only administrators can modify institution records." });
    }

    const meta = TABLES[table];
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const now = new Date().toISOString();
    const insertedIds = [];

    const insertOne = db.transaction((rawItem) => {
      const item = toRow(table, rawItem);
      if (!item.id) item.id = randomUUID();
      if (meta.columns.includes("created_at") && !item.created_at) item.created_at = now;
      if (meta.columns.includes("updated_at") && !item.updated_at) item.updated_at = now;

      const cols = Object.keys(item).filter((k) => meta.columns.includes(k));
      const placeholders = cols.map(() => "?").join(", ");
      const colList = cols.map((c) => `"${c}"`).join(", ");
      const stmt = db.prepare(`INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`);
      stmt.run(...cols.map((c) => item[c]));
      insertedIds.push(item.id);
    });

    try {
      for (const item of items) insertOne(item);
      const placeholders = insertedIds.map(() => "?").join(",");
      const rows = db
        .prepare(`SELECT * FROM "${table}" WHERE id IN (${placeholders})`)
        .all(...insertedIds);
      res.status(201).json(rows.map((r) => fromRow(table, r)));
    } catch (err) {
      console.error(`POST /api/table/${table} failed:`, err.message);
      res.status(400).json({ error: err.message });
    }
  });

  // UPDATE (by filter) -------------------------------------------------------
  app.patch("/api/table/:table", (req, res) => {
    const { table } = req.params;
    if (!isKnownTable(table)) return res.status(404).json({ error: `Unknown table "${table}"` });

    const authUser = getAuthUser(req);
    if (authUser && authUser.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Only administrators can modify institution records." });
    }

    const meta = TABLES[table];
    const { eqFilters, inFilters } = parseFilters(req.query, meta.columns);
    const { sql: whereSql, params: whereParams } = buildWhere(eqFilters, inFilters);
    if (!whereSql) return res.status(400).json({ error: "Refusing to update without a filter" });

    try {
      const idRows = db.prepare(`SELECT id FROM "${table}" ${whereSql}`).all(...whereParams);
      const ids = idRows.map((r) => r.id);
      if (ids.length === 0) return res.json([]);

      const updates = toRow(table, req.body || {});
      if (meta.columns.includes("updated_at")) updates.updated_at = new Date().toISOString();
      const setCols = Object.keys(updates).filter((k) => meta.columns.includes(k) && k !== "id");
      if (setCols.length > 0) {
        const setSql = setCols.map((c) => `"${c}" = ?`).join(", ");
        const idPlaceholders = ids.map(() => "?").join(",");
        db.prepare(`UPDATE "${table}" SET ${setSql} WHERE id IN (${idPlaceholders})`).run(
          ...setCols.map((c) => updates[c]),
          ...ids
        );
      }
      const idPlaceholders = ids.map(() => "?").join(",");
      const rows = db.prepare(`SELECT * FROM "${table}" WHERE id IN (${idPlaceholders})`).all(...ids);
      res.json(rows.map((r) => fromRow(table, r)));
    } catch (err) {
      console.error(`PATCH /api/table/${table} failed:`, err.message);
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE (by filter) --------------------------------------------------------
  app.delete("/api/table/:table", (req, res) => {
    const { table } = req.params;
    if (!isKnownTable(table)) return res.status(404).json({ error: `Unknown table "${table}"` });

    const authUser = getAuthUser(req);
    if (authUser && authUser.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Only administrators can modify institution records." });
    }

    const meta = TABLES[table];
    const { eqFilters, inFilters } = parseFilters(req.query, meta.columns);
    const { sql: whereSql, params } = buildWhere(eqFilters, inFilters);
    if (!whereSql) return res.status(400).json({ error: "Refusing to delete without a filter" });

    try {
      const rows = db.prepare(`SELECT * FROM "${table}" ${whereSql}`).all(...params);
      db.prepare(`DELETE FROM "${table}" ${whereSql}`).run(...params);
      res.json(rows.map((r) => fromRow(table, r)));
    } catch (err) {
      console.error(`DELETE /api/table/${table} failed:`, err.message);
      res.status(400).json({ error: err.message });
    }
  });
}

module.exports = { registerGenericTableRoutes };
