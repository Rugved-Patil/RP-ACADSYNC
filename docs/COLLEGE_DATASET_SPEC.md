# JNEC MGM University — Institutional Dataset Specification

This document details the authentic engineering curriculum dataset used by RP-ACADSYNC for Jawaharlal Nehru Engineering College (JNEC), MGM University (ECT & AI-DS Departments).

---

## 1. Class & Student Batch Architecture

Each undergraduate class has ~60 students and is subdivided into **3 student batches**:
* `Batch A` (~20 students)
* `Batch B` (~20 students)
* `Batch C` (~19 students)

### Active Classes (6)
1. `SE-ECCE`: Second Year Electronics & Computer Engineering (3 Batches: A, B, C)
2. `SE-AIDS`: Second Year Artificial Intelligence & Data Science (3 Batches: A, B, C)
3. `TY-ECCE`: Third Year Electronics & Computer Engineering (3 Batches: A, B, C)
4. `TY-AIDS`: Third Year Artificial Intelligence & Data Science (3 Batches: A, B, C)
5. `B.Tech-ECCE`: Final Year Electronics & Computer Engineering (3 Batches: A, B, C)
6. `B.Tech-AIDS`: Final Year Artificial Intelligence & Data Science (3 Batches: A, B, C)

---

## 2. Facilities: Classrooms & Specialized Laboratories (16)

### Lecture Halls (7)
* `SF-31` (Capacity: 70)
* `SF-32` (Capacity: 70)
* `SF-33` (Capacity: 70)
* `TF-31` (Capacity: 70)
* `TF-32` (Capacity: 70)
* `FF-22` (Capacity: 70)
* `Jack Kilby Hall` (Capacity: 120)

### Specialized Laboratories (9, `is_lab: 1`)
* `System Software Lab (FF-21)` (Capacity: 25)
* `Programming Lab-1 (FF-28)` (Capacity: 25)
* `Programming Lab-2 (FF-28)` (Capacity: 25)
* `Analog Circuit Lab (FF-33)` (Capacity: 25)
* `EDC Lab (FF-34)` (Capacity: 25)
* `Communication Lab (FF-36)` (Capacity: 25)
* `DMP Lab (FF-38)` (Capacity: 25)
* `Data Science Lab-II (FF-40)` (Capacity: 25)
* `Electronic Workshop Lab (FF-30)` (Capacity: 25)

---

## 3. Faculty Roster (19)

| Name | Email | Role | Default Password |
| :--- | :--- | :--- | :--- |
| Dr. S. N. Pawar | `snpawar@jnec.ac.in` | Professor | `teacher123` |
| Prof. F. I. Shaikh | `fishaikh@jnec.ac.in` | Assistant Professor | `teacher123` |
| Dr. V. B. Malode | `vbmalode@jnec.ac.in` | Associate Professor | `teacher123` |
| Dr. V. A. More | `vamore@jnec.ac.in` | Assistant Professor | `teacher123` |
| Prof. V. A. Kulkarni | `vakulkarni@jnec.ac.in` | Assistant Professor | `teacher123` |
| Prof. S. A. Annadate | `saannadate@jnec.ac.in` | Assistant Professor | `teacher123` |
| Prof. G. R. Basole | `grbasole@jnec.ac.in` | Assistant Professor | `teacher123` |
| Prof. A. P. Phatale | `apphatale@jnec.ac.in` | Assistant Professor | `teacher123` |
| Prof. A. R. Salunke | `arsalunke@jnec.ac.in` | Assistant Professor | `teacher123` |
| Dr. C. S. Khandelwal | `cskhandelwal@jnec.ac.in` | Professor | `teacher123` |
| Prof. S. D. Jadhav | `sdjadhav@jnec.ac.in` | Assistant Professor | `teacher123` |
| Prof. M. A. Mulay | `mamulay@jnec.ac.in` | Assistant Professor | `teacher123` |
| Dr. S. D. Gavarskar | `sdgavarskar@jnec.ac.in` | Associate Professor | `teacher123` |
| Prof. M. K. Pawar | `mkpawar@jnec.ac.in` | Assistant Professor | `teacher123` |
| Prof. P. B. Murmude | `pbmurmude@jnec.ac.in` | Assistant Professor | `teacher123` |
| Prof. A. G. Patil | `agpatil@jnec.ac.in` | Assistant Professor | `teacher123` |
| Prof. P. P. Patil | `pppatil@jnec.ac.in` | Assistant Professor | `teacher123` |
| Prof. V. J. Lipne | `vjlipne@jnec.ac.in` | Assistant Professor | `teacher123` |
| Prof. R. L. Mudbe | `rlmudbe@jnec.ac.in` | Assistant Professor | `teacher123` |

---

## 4. Master CSV Ingestion Schema

The file `college_master_import.csv` contains 14 columns:

```csv
Record_Type,Name,Code,Year,Capacity,Periods_Per_Week,Is_Lab,Lab_Duration_Hours,Email,Specialization,Location,Equipment,Classes,Teachers
```

* `YEAR`: Defines academic cohorts (`Name`, `Code`).
* `CLASS`: Defines student divisions (`Name`, `Code`, `Year`, `Capacity`).
* `ROOM`: Defines lecture halls and labs (`Name`, `Capacity`, `Is_Lab`, `Location`, `Equipment`).
* `TEACHER`: Defines faculty members (`Name`, `Email`, `Specialization`).
* `SUBJECT`: Defines courses with credits, duration, class assignments, and teacher eligibility.
