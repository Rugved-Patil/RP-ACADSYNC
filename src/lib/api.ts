// api.ts — Local REST & Query Client for ACADSYNC.
//
// Backed by fetch() calls to the local Express API (see server/lib/genericTable.js).
// Supports fluent query syntax: .from('table').select('*').eq('id', x)
//
// Note: In dev, Vite proxies /api/* to the local Express server on :4000.

import { authService } from "../services/authService";

const API_BASE = "/api";

type Filter = { col: string; op: "eq" | "in"; value: any };

class QueryBuilder<T = any> implements PromiseLike<{ data: T | null; error: { message: string } | null }> {
  private table: string;
  private filters: Filter[] = [];
  private orderParams: string[] = [];
  private limitVal: number | null = null;
  private selectCols: string | null = null;
  private mode: "select" | "insert" | "update" | "delete" = "select";
  private payload: any = null;
  private singleMode: "single" | "maybeSingle" | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(cols?: string) {
    if (cols && cols !== "*") this.selectCols = cols;
    return this;
  }

  eq(col: string, value: any) {
    this.filters.push({ col, op: "eq", value });
    return this;
  }

  in(col: string, values: any[]) {
    this.filters.push({ col, op: "in", value: values });
    return this;
  }

  order(col: string, opts: { ascending?: boolean } = {}) {
    // Support the one call site that passes a comma-joined string of
    // columns (e.g. "day, time_slot_id") instead of chaining .order() twice.
    const cols = col.split(",").map((c) => c.trim()).filter(Boolean);
    const dir = opts.ascending === false ? "desc" : "asc";
    for (const c of cols) this.orderParams.push(`${c}.${dir}`);
    return this;
  }

  limit(n: number) {
    this.limitVal = n;
    return this;
  }

  single() {
    this.singleMode = "single";
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this;
  }

  insert(payload: any) {
    this.mode = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.mode = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  private buildQuery(): string {
    const qs = new URLSearchParams();
    for (const f of this.filters) {
      if (f.op === "eq") qs.append(f.col, String(f.value));
      else qs.append(`${f.col}__in`, f.value.map(String).join(","));
    }
    if (this.selectCols) qs.set("select", this.selectCols);
    for (const o of this.orderParams) qs.append("order", o);
    if (this.limitVal != null) qs.set("limit", String(this.limitVal));
    const qsStr = qs.toString();
    return qsStr ? `?${qsStr}` : "";
  }

  private async execute(): Promise<{ data: any; error: { message: string } | null }> {
    const path = `${API_BASE}/table/${this.table}`;
    let method: string = "GET";
    let body: string | undefined;

    if (this.mode === "insert") {
      method = "POST";
      body = JSON.stringify(this.payload);
    } else if (this.mode === "update") {
      method = "PATCH";
      body = JSON.stringify(this.payload);
    } else if (this.mode === "delete") {
      method = "DELETE";
    }

    const url = path + this.buildQuery();

    const token = authService.getToken();
    const headers: Record<string, string> = {};
    if (body) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        body,
      });
    } catch (err: any) {
      return { data: null, error: { message: err?.message || "Network error contacting local server" } };
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: res.statusText }));
      return { data: null, error: { message: errBody.error || res.statusText } };
    }

    let data: any = res.status === 204 ? [] : await res.json().catch(() => []);

    if (this.singleMode === "single") {
      const row = Array.isArray(data) ? data[0] ?? null : data;
      if (!row) return { data: null, error: { message: "No rows found" } };
      return { data: row, error: null };
    }
    if (this.singleMode === "maybeSingle") {
      const row = Array.isArray(data) ? data[0] ?? null : data;
      return { data: row, error: null };
    }

    return { data, error: null };
  }

  // Makes the builder awaitable:
  // `const { data, error } = await db.from(...).select()...`
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected as any);
  }
}

async function invokeFunction(name: string, opts: { body?: any } = {}) {
  try {
    const token = authService.getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/functions/${name}`, {
      method: "POST",
      headers,
      body: JSON.stringify(opts.body || {}),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: res.statusText }));
      return { data: null, error: { message: errBody.error || res.statusText } };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err?.message || "Network error contacting local server" } };
  }
}

export const db = {
  from(table: string) {
    return new QueryBuilder(table);
  },
  functions: {
    invoke: invokeFunction,
  },
};

export const apiClient = db;
export const supabase = db;

