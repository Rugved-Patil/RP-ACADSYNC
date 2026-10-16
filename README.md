# RP-ACADSYNC — Academic Scheduling & Synchronization System

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./package.json)
[![Tests](https://img.shields.io/badge/tests-40%20passing-brightgreen.svg)](./server/test)
[![License](https://img.shields.io/badge/license-Academic-orange.svg)](#-license)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18.3-61dafb.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/sqlite-WAL%20mode-003B57.svg)](https://www.sqlite.org/)
[![AI](https://img.shields.io/badge/AI%20Assistant-Gemini%203.6%20Flash-8E75C4.svg)](https://ai.google.dev/)

**RP-ACADSYNC** is a modern, automated, AI-assisted institutional timetable generator and academic synchronization platform built for universities and engineering colleges.

Operating on a local-first **SQLite (WAL mode)** architecture paired with a responsive **React 18 + TypeScript** interface and **Node.js Express** backend, it solves NP-hard academic timetabling using a **Memetic Genetic Algorithm (GA)** with local conflict repair. It synchronizes **concurrent multi-batch laboratory sessions (Batch A/B/C)**, enforces strict **credit-to-contact hour allocations**, balances **faculty daily workloads**, provides **Role-Based Access Control (Admin, Faculty, Student)**, features an intelligent **Gemini 3.6 Flash AI assistant sidecar**, and offers **8 artisan visual themes**.

---

## 🏛️ Project Lineage & Final Year Capstone Origin

> [!NOTE]
> **Built upon the Final Year Engineering Project**:  
> **RP-ACADSYNC** is an advanced, production-grade evolution and architectural rewrite of the original final year capstone project:  
> 🔗 **Original Legacy Repository**: [https://github.com/Rugved-Patil/RP-ACADSYNC_Old.git](https://github.com/Rugved-Patil/RP-ACADSYNC_Old.git)

### The Evolution: Prototype to Production System
While the original project explored core concepts of automated academic scheduling, this updated version represents a complete architectural overhaul designed for real-world institutional deployment:

| Feature Dimension | Legacy Project ([RP-ACADSYNC_Old](https://github.com/Rugved-Patil/RP-ACADSYNC_Old.git)) | Modern RP-ACADSYNC (Current Version) |
| :--- | :--- | :--- |
| **Scheduling Engine** | Basic heuristic / initial scheduling scripts | **Memetic Genetic Algorithm (GA)** with local repair, 0 hard collisions, rotational batch concurrency, and mid-day gap minimization |
| **Laboratory Architecture** | Generic lab allocation | **Synchronous Parallel Multi-Batch Routing** (`Batch A`, `Batch B`, `Batch C`) across specialized labs with 1-credit & multi-credit duration support |
| **Room Constraints** | Basic room assignments | **Intelligent Routing**: Class `Default_Room` lecture hall affinity + subject-specific `Allowed_Rooms` routing |
| **Database Architecture** | Legacy setup / external DB dependencies | Standalone, zero-config **SQLite with WAL mode (`better-sqlite3`)** and atomic transactional integrity |
| **Security & Auth** | Basic credentials | **Production-grade RBAC** with `scrypt` cryptographic password hashing, per-user salts, and signed `HMAC-SHA256` session tokens |
| **AI Assistant** | Static / rule-based helpers | **Google Gemini 3.6 Flash Sidecar** (`Python`) with dynamic SQLite schema and timetable context injection |
| **User Interface** | Basic dashboard | **Artisan UI (React 18 + Tailwind + Radix UI)** with **8 curated HSL palettes**, light/dark modes, and a modern calendar favicon |
| **Data Interoperability** | Disjointed spreadsheets | **Idempotent Master CSV Bulk Importer & Exporter** (`college_master_import.csv`) with full relational roundtrip fidelity |
| **Verification & Testing** | Minimal or manual testing | **40 Automated Unit & Integration Tests** spanning GA convergence, security, CRUD, importers, and schedule overrides |

---

## 🌟 Key Features

### 1. 🧬 Conflict-Free Memetic Genetic Algorithm Scheduler
* **Hard Constraints (0 Violations Guaranteed)**:
  * No teacher double-booking across any period.
  * No classroom or laboratory double-booking.
  * No student class or batch collisions.
  * Strict physical capacity and room equipment validation.
* **Credit-to-Contact Hour Rules**:
  * **Theory Subjects**: $1\text{ Credit} = 1\text{ Hour/Week}$ lecture.
  * **Laboratory Subjects**: Flexible 1-credit (1 hr/wk) or 2-credit ($1\text{ Credit} = 2\text{ Hours/Week}$ hands-on lab block).
* **Concurrent Multi-Batch Synchronization**: Automatically schedules `Batch A`, `Batch B`, and `Batch C` in parallel rooms during 2-hour laboratory blocks to maximize free windows for theory lectures.
* **Room Affinity & Allocation**:
  * **Theory Lectures**: Prioritizes the class's designated `Default_Room` (e.g. `SF-31`, `SF-32`) or verified lecture halls.
  * **Laboratories**: Strictly routed to specialized facilities matching the subject's `Allowed_Rooms` (e.g., Programming Lab, Analog Circuits Lab, DSP Lab).
* **Faculty Load Balancing**: Enforces configurable daily maximum lecture thresholds per teacher to prevent fatigue.
* **Student Experience Optimization**: Soft-fitness rewards that minimize awkward mid-day idle gaps between lectures.

---

### 2. 👥 Role-Based Access Control (RBAC) & Dedicated Portals
* **Cryptographic Security**: Native `node:crypto` `scrypt` key derivation with individual cryptographic salts, sanitized auth payloads, and signed `HMAC-SHA256` session cookies/tokens.
* **Three Dedicated User Experiences**:
  * **Admin Portal**: Complete institutional control — configure academic years, classes, batches, classrooms, faculty, subjects, run GA generation, trigger lossless exports, or execute double-confirmed emergency system resets.
  * **Faculty Portal**: Personalized teacher schedule, real-time availability checker, temporary slot change request submission, and approval tracking.
  * **Student Portal**: Real-time view of class-wide theory lectures and batch-specific laboratory schedules with room designations.

---

### 3. 🤖 Intelligent Timetable Assistant (Gemini 3.6 Flash)
* **Natural Language Queries**: Interrogate schedules in plain English (e.g., *"Which lab does SE-AIDS have on Friday?"*, *"Where is Dr. S. N. Pawar teaching on Monday at 11:00?"*, *"Show me all free slots for TY-ECCE"*).
* **Python Assistant Sidecar**: Dynamic SQLite database grounding injecting live institutional metadata and timetables into prompts.
* **Minimalist UI**: Sleek, circular bottom-right floating trigger button (FAB) with an expandable, modern conversational panel.

---

### 4. 🎨 8 Curated Artisan Visual Themes
Crafted using custom HSL CSS token architecture for eye comfort, clean readability, and optimal contrast across both light and dark modes:
1. **Warm Linen & Olive** *(Default Signature Artisan)*
2. **Cool Slate & Sage** *(Cool Editorial Botanic)*
3. **Terracotta & Dune** *(Desert Warmth & Clay)*
4. **Nocturne Olive** *(Dark Studio Mode)*
5. **Espresso & Oat** *(Rich Roast Minimalist)*
6. **Indigo & Parchment** *(Oxford Tailored Navy)*
7. **Burgundy & Tweed** *(Heritage Bordeaux Rose)*
8. **Nordic Moss & Pine** *(Deep Twilight Forest Dark Studio)*

*Switch themes instantly from **Settings** (`/settings`) with automatic localStorage persistence.*

---

### 5. 📦 Standardized Master CSV Import & Backup System
* **Idempotent 1-Click Master Import**: Import academic years, classes, batches, lecture halls, specialized laboratories, faculty with workloads, and subjects with room affinities through `college_master_import.csv`.
* **Modular CSV Support**: Supports individual modular imports for classes, rooms, teachers, and subjects.
* **Lossless Backup Export**: One-click download of the entire relational database into standard CSV format via `/api/admin/export-master-data`.
* **Danger Zone Kill-Switch**: Safe double-confirmed data wipe preserving administrator authentication.

---

### 6. 📊 Multi-Format Timetable Exporters & Overrides
* **Multi-Format Exports**: Export timetables for full week or single days in **CSV**, multi-sheet **Excel (.xlsx)**, **HTML**, and **JSON**.
* **Teacher Change Requests**: Faculty can request slot swaps; administrators can review, approve, or reject.
* **Schedule Overrides**: Approved requests create non-destructive temporary overrides that can optionally be promoted into permanent schedule templates.

---

## 🏗️ Architecture & Directory Structure

```
RP-ACADSYNC/
├── README.md                      # Comprehensive project documentation & guide
├── index.html                     # Vite entry point with modern calendar favicon
├── package.json                   # Root scripts & frontend dependencies
│
├── docs/                          # 📖 Centralized Institutional Documentation Hub
│   ├── PROJECT_SCOPE.md           # System Architecture & Detailed Scope Document
│   ├── COLLEGE_DATASET_SPEC.md    # JNEC MGM University dataset breakdown & credit rules
│   └── HANDOVER_REPORT.md         # Milestone transition & technical status record
│
├── college_import_data/           # 📦 Production Master Import Datasets
│   ├── college_master_import.csv  # 1-Click Master Relational CSV (Classes, Rooms, Faculty, Subjects)
│   ├── 1_classes.csv              # Class breakdown with Default_Room assignments
│   ├── 2_classrooms_and_labs.csv  # Lecture halls & specialized laboratories
│   ├── 3_teachers.csv             # Faculty breakdown with max daily period caps
│   ├── 4_subjects_and_labs.csv    # Theory & practical subjects with allowed rooms & credits
│   └── README.md                  # Dataset notes
│
├── src/                           # 💻 React 18 + TypeScript + Tailwind Frontend
│   ├── components/                # UI widgets (timetable grids, subject forms, chat FAB)
│   ├── pages/                     # Dashboard, Timetables, Classes, Teachers, Subjects, Settings, Login
│   ├── services/                  # API clients (Auth, Themes, Timetable, Admin)
│   ├── types/                     # TypeScript domain models
│   └── index.css                  # Custom token palettes for all 8 artisan themes
│
├── server/                        # ⚡ Node.js + Express API Backend
│   ├── db.js                      # SQLite database layer (better-sqlite3, WAL mode)
│   ├── index.js                   # Express API routes
│   ├── seed.js                    # Database seeder with authentic college curriculum
│   ├── chatbot/assistant.py       # Python Gemini 3.6 Flash assistant sidecar
│   ├── lib/                       # Generator (GA), Importer, Exporter, Auth, AdminData
│   │   ├── generator.js           # Memetic GA Timetable Engine
│   │   ├── importer.js            # Master CSV Bulk Importer
│   │   ├── exporter.js            # Timetable Multi-Format Exporter
│   │   ├── auth.js                # scrypt hashing & HMAC token manager
│   │   └── adminData.js           # Kill-switch & Master export routines
│   ├── test/                      # 40 automated unit & integration test suites
│   └── data/acadsync.db           # Self-contained SQLite database file
│
└── public/                        # 🌐 Static Assets (favicon.svg, college_master_import.csv)
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher
* **Python**: 3.9+ (optional, required only for live Gemini AI chatbot)

### 1. Clone the Repository
```bash
git clone https://github.com/Rugved-Patil/RP-ACADSYNC.git
cd RP-ACADSYNC
```

### 2. Install Dependencies
```bash
npm install
```
*(This installs frontend packages and automatically installs backend dependencies in `server/`).*

### 3. Configure Environment Variables (Optional for AI Chatbot)
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Add your Google Gemini API key if you wish to use the conversational assistant:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=4000
```

### 4. Run Development Servers
Launch both the Vite frontend client and Express backend server concurrently:
```bash
npm run dev
```

* **Frontend Application**: `http://localhost:5173`
* **Backend API**: `http://localhost:4000`

---

## 🔑 Default Institutional Credentials

The platform comes pre-seeded with authentic engineering curriculum data (JNEC MGM University):

| Portal | Email | Password | Role & Permissions |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@acadsync.edu` | `admin123` | Full governance, data import/export, GA generation, kill-switch |
| **Faculty Portal** | `snpawar@jnec.ac.in` *(or any faculty email)* | `teacher123` | View teacher timetable, submit temporary slot change requests |
| **Student Portal** | `student.seecce@jnec.ac.in` *(or any class rep)* | `student123` | View class lectures & batch-specific laboratory schedules |

> [!TIP]
> **1-Click Demo Login**: Quick-login buttons for Admin, Teacher, and Student roles are available directly on the `/login` screen for fast testing and demonstrations.

---

## 🧪 Testing & Verification

RP-ACADSYNC includes a comprehensive test suite executed with Node's native test runner (`node:test`):

```bash
npm test
```

### 40 Test Suites Across 7 Subsystems:
* ✔ **Admin Data Management**: Kill-switch safe data wipe & lossless re-seed.
* ✔ **Authentication & RBAC**: `scrypt` hashing, per-user salt sanitization, HMAC-SHA256 session tokens, duplicate detection, and route protection.
* ✔ **AI Assistant (Gemini 3.6 Flash)**: Query validation, navigation answers, and schedule data context injection.
* ✔ **CRUD & Database Persistence**: SQLite table definitions, foreign keys, cascade rules, JSON/boolean serialization, and atomic transaction rollback.
* ✔ **Timetable Exporters**: Full-week and single-day exports across CSV, Excel (.xlsx multi-sheet), HTML, and JSON.
* ✔ **Genetic Algorithm Scheduler**: Conflict-free 0-hard-violation generation, room constraint adherence, and rotational batch synchronization.
* ✔ **Bulk CSV & Master Data Importer**: Idempotent master import with `Default_Room`, `Allowed_Rooms`, and 1-credit lab scheduling.
* ✔ **Teacher Change Requests**: Live free-slot calculation, double-booking rejection, temporary override creation, and permanent template promotion.

---

## 📚 Documentation Hub

Detailed institutional guides and architectural specifications are located in [`docs/`](./docs):

* 📄 [**System Architecture & Project Scope Document**](./docs/PROJECT_SCOPE.md): Complete specifications for the scheduling engine, data model, RBAC security, genetic algorithm constraints, and UI design tokens.
* 📋 [**Institutional Dataset Specification**](./docs/COLLEGE_DATASET_SPEC.md): Full breakdown of classes, batches (A, B, C), lecture halls, specialized laboratories, faculty roster, and credit calculation rules.
* 🔄 [**Project Handover & Milestone Report**](./docs/HANDOVER_REPORT.md): Historical milestone records and technical transition status.

---

## 📄 License & Attribution

* **Author**: Developed by **Rugved Patil**
* **Project Lineage**: Built upon and evolved from the Final Year Engineering Project ([RP-ACADSYNC_Old](https://github.com/Rugved-Patil/RP-ACADSYNC_Old.git)).
* **License**: For academic, institutional, and research evaluation.
