# JNEC MGM University — Standardized College Import Data

This directory contains standardized, clean CSV files for the Jawaharlal Nehru Engineering College (JNEC) MGM University ECT & AI-DS Department dataset.

## Option 1: Master All-in-One Import (Recommended)
Use **`college_master_import.csv`** to import everything in a single step:
- Automatically creates all Academic Years (`First Year (FY)`, `Second Year (SE)`, `Third Year (TY)`, `Final Year (B.Tech)`).
- Provisions all 6 undergraduate classes (`SE-ECCE`, `SE-AIDS`, `TY-ECCE`, `TY-AIDS`, `B.Tech-ECCE`, `B.Tech-AIDS`).
- Provisions all 16 classrooms: 7 Lecture Halls (`SF-31`, `SF-32`, `SF-33`, `TF-31`, `TF-32`, `FF-22`, `Jack Kilby Hall`) and 9 specialized laboratories with `is_lab: 1`.
- Provisions all 19 Faculty members with email, designation, and subject expertise.
- Provisions all 63 subjects (36 Theory courses and 27 2-Hour Practical Labs with `is_lab: 1` and `lab_duration_hours: 2`).
- Automatically links all Subject-Class and Teacher-Subject relationships.
- Automatically provisions user accounts for Faculty (`teacher123`) and Student class representatives (`student123`).

## Option 2: Individual Category Imports
You can also import each category individually via the Data Upload page in the following sequence:
1. `1_classes.csv`
2. `2_classrooms_and_labs.csv`
3. `3_teachers.csv`
4. `4_subjects_and_labs.csv`

## Accommodating Practical Labs
All practical laboratory sessions are configured with:
- `Is Lab: Yes` (`is_lab: 1`)
- `Lab Duration Hours: 2` (2-hour contiguous practical block)
- Scheduled in dedicated lab-flagged facilities without crossing break periods.
