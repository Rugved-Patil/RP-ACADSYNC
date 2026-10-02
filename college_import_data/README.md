# JNEC MGM University — Standardized College Import Data

This directory contains standardized, clean CSV files for the Jawaharlal Nehru Engineering College (JNEC) MGM University ECT & AI-DS Department dataset.

## Master All-in-One Import (Recommended)
Use **`college_master_import.csv`** to import everything in a single step:
- Automatically creates all Academic Years (`First Year (FY)`, `Second Year (SE)`, `Third Year (TY)`, `Final Year (B.Tech)`).
- Provisions all 6 undergraduate classes with 3 distinct student batches (`Batch A: 20`, `Batch B: 20`, `Batch C: 19`).
- Provisions all 16 classrooms: 7 Lecture Halls and 9 specialized laboratories with `is_lab: 1`.
- Provisions all 19 Faculty members with email, designation, and subject expertise.
- Provisions all 63 subjects (Theory courses with credits/periods, and 2-Hour Practical Labs with `is_lab: 1` and `lab_duration_hours: 2`).
- Automatically links all Subject-Class and Teacher-Subject relationships.
- Automatically provisions user accounts for Faculty (`teacher123`) and Student class representatives (`student123`).
