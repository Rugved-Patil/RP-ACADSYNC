# RP-ACADSYNC — Project Handover & Transition Report

**Project Name**: RP-ACADSYNC (Academic Scheduling & Synchronization System)  
**Version**: V1.0.0 (Production-Ready Local SQLite + React + RBAC + AI Assistant + 8 Artisan Themes)  
**GitHub Repository**: [`https://github.com/Rugved-Patil/RP-ACADSYNC.git`](https://github.com/Rugved-Patil/RP-ACADSYNC.git)  
**Current Branch**: `main`  
**Date & Timestamp**: October 2, 2026  

---

## 1. Executive Summary & Current Project Stage

RP-ACADSYNC is an automated, AI/GA-driven institutional timetable generation and academic management platform. The project is completely self-contained, running on a local SQLite database (WAL mode) with a Node.js Express backend and a React + Vite + Tailwind CSS frontend.

### Current Status: **Production-Ready (All 39 Tests Passing)**
* **Conflict-Free Genetic Algorithm (GA)**: Schedules 254 weekly periods across 6 classes and 3 student batches (A, B, C) with **0 hard constraint violations** in ~1–6 seconds.
* **Credit-to-Hours System**: Hardcoded institutional rule ($1\text{ Theory Credit} = 1\text{ Hr/Wk}$ lecture; $1\text{ Practical Credit} = 2\text{ Hr/Wk}$ lab session).
* **Multi-Batch Lab Concurrency**: Batch A, B, and C can attend different practical subjects simultaneously in specialized laboratories.
* **Role-Based Authentication (RBAC)**: Secure user management for Admins, Teachers, and Students with `scrypt` password hashing and HMAC-SHA256 session tokens.
* **8 Curated Artisan Themes**: High-contrast, accessibility-tested themes in **Settings** (`linen-olive`, `slate-sage`, `terracotta-dune`, `nocturne-olive`, `espresso-oat`, `indigo-parchment`, `burgundy-tweed`, `nordic-moss`).
* **Intelligent AI Assistant**: Natural language chatbot powered by Google Gemini 3.6 Flash via a Python backend assistant.
* **Lossless Master CSV Export & Import**: Single-file relational backup and re-import via `college_master_import.csv` with 100% roundtrip fidelity.
* **Minimalist UI & Calendar Favicon**: Clean design, responsive floating chatbot trigger, and crisp SVG calendar icon.

---

## 2. Key Architecture Details

### A. Laboratory & Student Batch Architecture
* **The College Batch Model**:
  * Classes of ~60 students are divided into 3 batches of ~20 students each: `Batch A`, `Batch B`, `Batch C`.
  * **Concurrent Parallel Labs**: Different batches of the same class attend different practical subjects simultaneously in different specialized rooms with different professors.
* **Database & Engine Implementation**:
  * `batch TEXT` column in `lessons` table.
  * Genetic algorithm scheduler optimizes batch grouping with parallel lab synchronization bonuses.

### B. Standardized Master CSV Import & Export System
* **Master Schema**: `Record_Type,Name,Code,Year,Capacity,Periods_Per_Week,Is_Lab,Lab_Duration_Hours,Email,Specialization,Location,Equipment,Classes,Teachers`.
* **Export Endpoint**: `GET /api/admin/export-master-data` allows one-click full system backup in standard CSV format.
* **Emergency Danger Zone**: Double confirmation kill switch (`DELETE ALL DATA`) safely resets data while preserving admin access.

### C. Active Dataset & Credentials Reference

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **System Admin** | System Administrator | `admin@acadsync.edu` | `admin123` |
| **Faculty (All 19)** | e.g. Dr. S. N. Pawar | `snpawar@jnec.ac.in` | `teacher123` |
| **Students (All 6 Classes)** | e.g. SE-ECCE Rep | `student.seecce@jnec.ac.in` | `student123` |

---

## 3. Test Suites & Verification

* Run `npm test` to execute all 39 test suites across:
  * Admin Data Management (Kill-switch & Seed)
  * Authentication, Salting & Role Authorization
  * AI Chatbot Context Queries
  * SQLite CRUD & Foreign Key Integrity
  * Timetable Exporters (CSV, Excel, HTML, JSON)
  * Genetic Algorithm 0-Hard-Violation Generator
  * Master CSV Relational Importer
  * Teacher Change Requests & Schedule Overrides
