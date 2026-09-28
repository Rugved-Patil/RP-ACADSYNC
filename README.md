# ACADSYNC

Automatic timetable generator for engineering colleges — define years,
classes, subjects, teachers, and classrooms, configure period timings, and
generate a conflict-free weekly timetable with one click.

This app is **fully local**. There's no login, no cloud database, and no
account to set up — clone it, install, run, and it opens straight to the
dashboard. All your data lives in a single SQLite file on your own machine.

## Architecture

- **Frontend**: React + TypeScript + Vite, shadcn/ui, Tailwind CSS
- **Backend**: a small Express server (`server/`) backed by SQLite
  (`better-sqlite3`) — the whole database is one file:
  `server/data/acadsync.db`
- Two processes run side by side in development: Vite serves the frontend on
  `:8080` and proxies any `/api/*` request to the Express server on `:4000`

There is no external service, API key, or environment variable required to
run this app.

## Getting started

**Requirements:** Node.js 18+ and npm.

```bash
git clone <this-repo-url>
cd RP-ACADSYNC
npm install        # installs both the frontend and server dependencies
npm run dev         # starts the frontend (:8080) and the API server (:4000) together
```

Then open **http://localhost:8080**. That's it — no `.env` file, no database
setup, no signup screen.

To run the two halves separately (e.g. for debugging):

```bash
npm run dev:server   # Express + SQLite API on :4000
npm run dev:client   # Vite frontend on :8080
```

### Your data

Everything you enter is stored in `server/data/acadsync.db`. That file is
git-ignored, so a fresh clone always starts empty. To back up your data, copy
that file somewhere safe. To start over, delete it — it's recreated
automatically the next time the server starts.

### Building for production

```bash
npm run build        # builds the frontend into dist/
npm run dev:server    # the API server (dist/ isn't auto-served — see note below)
```

`npm run build` only builds the frontend static files; you still need the
Express server running to serve `/api`. This app was built for local,
single-admin use rather than public deployment, so there's no bundled
production launcher — if you want a single-process production setup, the
simplest approach is to add `express.static` to `server/index.js` pointing
at `../dist` and serve the whole app from port 4000.

## What changed from the original Lovable/Supabase version

This is a from-scratch local rewrite of a project that used to run on
Supabase (Postgres + Auth + Deno Edge Functions). If you're comparing against
an older version of this repo, here's what's different:

**Removed entirely:**
- **Login/auth** — there is no sign-up or sign-in page anymore. The app
  opens directly to the dashboard as a single local admin. If you need
  multi-user access control back, that's a real feature to design, not a
  quick flag flip.
- **Lab-scheduling side-feature** (the `lab_schedules` / `batches` /
  `batch_teacher_assignments` tables, the "Manage Labs" dialog, and "Divide
  into Batches") — this was a manually-managed system that ran in parallel
  to the real timetable generator without being aware of it, and was called
  out as a recurring source of bugs. It's gone. The core lab-handling that
  the generator actually uses — marking a *subject* as a lab with a 1-2 hour
  duration, and marking a *classroom* as a lab — is untouched.
- **Duplicate Classrooms pages** — `ClassroomsPage.tsx` (which ran on stub
  mock data) and the unrouted `Classrooms.tsx` are gone.
  `ClassroomsManagement.tsx` is the one Classrooms screen now.
- **The unused legacy Express/MongoDB backend** (`server.js`, `controllers/`,
  `models/`, `routes/`, etc.) — this was already dead code, never called by
  the frontend, and has been deleted.
- **PDF import** — the old CSV/Excel/PDF bulk importer's PDF path was a
  best-effort text-scraping heuristic that rarely produced usable tables.
  CSV and Excel import both still work; PDF doesn't. Export/download to PDF
  is unaffected — that still works fine, since generating a PDF is a much
  easier problem than parsing one.

**Fixed (a real gap that pre-dates this rewrite):**
- The "Manage Teachers" dialog on the Subjects page — previously non-functional dead code — now properly manages which teachers are eligible to teach each subject (`teacher_subject_assignments`). Without this wiring, "Generate Timetable" had nothing to assign, so it would silently produce zero lessons for any subject with no eligible teacher. Assign at least one teacher to every subject you want scheduled.
- The Year field on the Classes page used to be a free-text box where you had to type a year's UUID by hand. It's now a real dropdown, with an inline "Add Year" box since there was previously no page to manage years at all.

**Everything else** (CRUD for classes/subjects/teachers/classrooms/timings,
the constraint-based generator, timetable views, CSV/Excel/PDF/HTML/JSON
export, WhatsApp/email share links, draft save/load) works the same as
before — just against the local SQLite database instead of Supabase.

## Project layout

```
src/                  React frontend
  lib/api.ts           Local API client — a small Supabase-shaped shim over fetch()
  services/timetableService.ts
  pages/, components/
server/               Express + SQLite backend
  db.js                Schema + type conversion helpers
  index.js             Express app / route registration
  lib/
    genericTable.js     Generic CRUD REST layer for every table
    generator.js         Timetable generation algorithm
    importer.js           CSV/Excel bulk import
    exporter.js            CSV/JSON/HTML/PDF/Excel timetable export
    sharer.js               WhatsApp/email share text formatting
  data/acadsync.db     Your SQLite database (git-ignored, created on first run)
```

## Planned AI features (not built yet)

A separate project-scope document outlines four AI/ML additions planned for
a future pass: a genetic-algorithm optimizer for the generator, a
natural-language timetable assistant, a substitute-teacher recommender, and
smart CSV column-mapping. None of that is in this codebase yet — this
rewrite's scope was getting the core app fully local and functional.
