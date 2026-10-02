# RP-ACADSYNC — Academic Scheduling & Synchronization System

**RP-ACADSYNC** (Version 1.0.0) is a standalone, automated, AI-assisted institutional timetable generator and academic synchronization platform built for engineering colleges and universities.

It eliminates manual scheduling conflicts using a **Genetic Algorithm (GA) with Memetic Local Repair**, coordinates **Concurrent Multi-Batch Laboratories (Batch A/B/C)** in specialized rooms, supports **Role-Based Access Control (Admin, Faculty, Student)**, features an intelligent **Gemini 3.6 Flash AI Assistant**, and provides **8 curated artisan color themes** for maximum focus and readability.

---

## 🌟 Key Features

### 1. 🧬 Conflict-Free Genetic Algorithm Scheduler
* **Hard Constraint Enforcement**: 0 collisions for teachers, classrooms, classes, and batches.
* **Specialized Lab Allocation**: Practical subjects are automatically routed to verified laboratory facilities.
* **Credit-Based Contact Hours**:
  * **Theory Subjects**: $1\text{ Credit} = 1\text{ Hour/Week}$ of classroom lecture.
  * **Laboratory Subjects**: $1\text{ Credit} = 2\text{ Hours/Week}$ of hands-on practical session.
* **Concurrent Batch Synchronization**: Automatically schedules `Batch A`, `Batch B`, and `Batch C` in parallel rooms during 2-hour laboratory blocks to maximize free windows for theory lectures.
* **Daily Workload Limits**: Distributes faculty load evenly across the week with configurable daily lecture maximums.

---

### 2. 👥 Role-Based Access Control (RBAC) & Authentication
* **Security Architecture**: Native `node:crypto` `scrypt` hashing with unique cryptographic salt per user and signed `HMAC-SHA256` session tokens.
* **Three Dedicated Portals**:
  * **System Administrator**: Complete governance over classes, teachers, subjects, classrooms, generation, backup export, and system kill switch.
  * **Faculty Portal**: View personalized schedule, submit temporary slot change requests, and track approval status.
  * **Student Portal**: View live class and batch timetable, room locations, and schedule updates.

---

### 3. 🤖 Intelligent Assistant (Gemini 3.6 Flash)
* **Natural Language Help & Timetable Queries**: Ask questions about platform navigation or schedule data (e.g. *"Which lab does SE-AIDS have on Friday?"*, *"Where is Dr. S. N. Pawar at 11:00 on Monday?"*).
* **Python Backend Engine**: Fast Python assistant integration with dynamic SQLite context injection.
* **Minimalist UI**: Sleek, circular bottom-right floating trigger button (FAB) with instant expandable panel.

---

### 4. 🎨 8 Artisan Visual Themes
Designed with custom HSL token architecture for eye-comfort and optimal contrast in both light and dark modes:
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

### 5. 📦 Standardized Master CSV Import & Backup Export
* **Single-File Import**: Import all academic years, classes, student batches, classrooms, laboratories, faculty, subjects, and relationships via `college_master_import.csv`.
* **Lossless Master Export**: Export the entire institutional database with relational integrity with one click in **Settings**.
* **Safety Controls**: Double-confirmation emergency kill switch (`DELETE ALL DATA`) preserving administrator credentials.

---

## 🏗️ Architecture & Directory Structure

```
RP-ACADSYNC/
├── README.md                      # Primary project overview & quickstart guide
├── index.html                     # Clean entry point with calendar favicon
│
├── docs/                          # 📖 Centralized Institutional Documentation Hub
│   ├── PROJECT_SCOPE.md           # Full System Architecture & Scope Document
│   ├── COLLEGE_DATASET_SPEC.md    # JNEC MGM University dataset breakdown & credit rules
│   └── HANDOVER_REPORT.md         # Milestone transition & technical status record
│
├── college_import_data/           # 📦 Production Master Import Datasets
│   ├── college_master_import.csv  # 1-Click Master Relational CSV (Classes, Batches, Rooms, Faculty, Subjects)
│   ├── 1_classes.csv              # Modular class breakdown
│   ├── 2_classrooms_and_labs.csv  # Modular room breakdown
│   ├── 3_teachers.csv             # Modular faculty breakdown
│   ├── 4_subjects_and_labs.csv    # Modular course & lab breakdown
│   └── README.md                  # Dataset notes
│
├── src/                           # 💻 React 18 + TypeScript + Tailwind Frontend
│   ├── components/                # Modular UI widgets (timetable grids, dialogs, chat FAB)
│   ├── pages/                     # Dashboard, Timetables, Classes, Teachers, Subjects, Settings, Login
│   ├── services/                  # API clients (Auth, Themes, Timetable, Admin)
│   └── index.css                  # Custom token palettes for all 8 artisan themes
│
├── server/                        # ⚡ Node.js + Express API Backend
│   ├── db.js                      # SQLite database layer (better-sqlite3)
│   ├── index.js                   # API routes
│   ├── chatbot/assistant.py       # Python Gemini 3.6 Flash assistant sidecar
│   ├── lib/                       # Generator (GA), Importer, Exporter, Auth, AdminData
│   ├── test/                      # 39 automated unit & integration test suites
│   └── data/acadsync.db           # Self-contained SQLite database file (WAL mode)
│
└── public/                        # 🌐 Static Assets (favicon.svg, college_master_import.csv)
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** v18 or newer
* **Python 3.9+** (for optional Gemini AI assistant)

### 1. Installation
```bash
git clone https://github.com/Rugved-Patil/RP-ACADSYNC.git
cd RP-ACADSYNC
npm install
```

### 2. Configure Environment (Optional for Chatbot)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Add your `GEMINI_API_KEY` in `.env` if you wish to use the live Gemini 3.6 Flash assistant).*

### 3. Run Development Server
```bash
npm run dev
```
* **Frontend Application**: `http://localhost:5173`
* **Backend API**: `http://localhost:4000`

---

## 🔑 Default Credentials

The platform is pre-seeded with authentic engineering college curriculum data:

| Portal | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Admin Portal** | `admin@acadsync.edu` | `admin123` | Full Administrative Access |
| **Faculty Portal** | `snpawar@jnec.ac.in` *(or any faculty email)* | `teacher123` | Faculty View & Change Requests |
| **Student Portal** | `student.seecce@jnec.ac.in` *(or any class rep)* | `student123` | Class & Batch Timetable View |

*(1-Click Demo Login buttons are also available directly on the `/login` screen).*

---

## 🧪 Testing & Verification

Run the comprehensive unit and integration test suite:

```bash
npm test
```
* **39 Test Suites Passing**:
  * Administrative Kill-Switch & Lossless Re-seed
  * Password Hashing (scrypt), Salt Sanitization & HMAC Token Signing
  * Role Authorization & Protected Routes
  * AI Chatbot Assistant Context Queries
  * SQLite CRUD & Foreign Key Integrity
  * Multi-format Timetable Exports (CSV, Excel, HTML, JSON)
  * Genetic Algorithm 0-Hard-Violation Timetable Generation
  * Master CSV Relational Bulk Importer
  * Teacher Change Requests & Schedule Overrides

---

## 📚 Project Documentation Hub

Detailed institutional guides and architectural specifications are organized in the [`docs/`](./docs) folder:

* 📄 [**System Architecture & Project Scope Document**](./docs/PROJECT_SCOPE.md): Complete specifications for the scheduling engine, data model, RBAC security, genetic algorithm constraints, and UI design tokens.
* 📋 [**Institutional Dataset Specification**](./docs/COLLEGE_DATASET_SPEC.md): Full breakdown of classes, batches (A, B, C), lecture halls, specialized laboratories, faculty roster, and credit calculation rules.
* 🔄 [**Project Handover & Milestone Report**](./docs/HANDOVER_REPORT.md): Historical milestone records and technical overview.

---

## 📄 License
Academic and institutional use. Developed by Rugved Patil.
