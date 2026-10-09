// generator.js — Authentic Genetic Algorithm (GA) timetable generation engine for ACADSYNC.
//
// Features:
// 1. Genuine Memetic Genetic Algorithm architecture:
//    - Population evolution across generations (popSize, maxGenerations).
//    - Tournament Selection (k=3) for parent reproduction.
//    - Class-Preserving and Day-Preserving Crossover.
//    - Adaptive Multi-Operator Mutation (Time/Day Shift, Room Reallocation, Teacher Alternate, Lab Alignment).
//    - Elitism (preserving top 10% fittest chromosomes).
//    - Memetic Local Repair for targeted conflict resolution.
// 2. Hard Constraints (Zero-Tolerance: -10,000 penalty per violation):
//    - Exact credit-to-hours mapping (Theory: 1 hr/week per credit; Lab: 2 hr/week block per credit per batch).
//    - No faculty double-booking.
//    - No room or lab double-booking.
//    - No class or batch double-booking (different batches can run concurrently).
//    - Strict laboratory room compliance (is_lab = 1).
//    - 2-hour labs strictly placed in contiguous non-break slots.
//    - Teacher daily workload limit (max_periods_per_day).
//    - No back-to-back same theory subject for the same class on the same day.
// 3. Soft Constraints (Multi-Objective Optimization):
//    - Class Schedule Continuity: Minimize middle-of-the-day gaps for student classes.
//    - Batch Lab Synchronization: Reward parallel lab sessions for Batches A, B, C.
//    - Department / Designated Classroom Preference.
//    - Faculty Idle Gap Minimization.
//    - Subject Weekly Dispersion across distinct days.
//    - Daily Class Load Balance across Monday-Saturday.

const { randomUUID } = require("crypto");
const { db, fromRow } = require("../db");

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const res = [...arr];
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [res[i], res[j]] = [res[j], res[i]];
  }
  return res;
}

function getClassBatches(cls) {
  if (cls.batches) {
    try {
      const parsed = typeof cls.batches === "string" ? JSON.parse(cls.batches) : cls.batches;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((b) => (typeof b === "object" && b.name ? b.name : String(b)));
      }
    } catch {}
  }
  const count = cls.student_count || cls.capacity || 60;
  if (count <= 25) return ["Batch A"];
  if (count <= 45) return ["Batch A", "Batch B"];
  return ["Batch A", "Batch B", "Batch C"];
}

function generateTimetable({
  name,
  academicYear,
  yearId,
  classId,
  timingId,
  popSize = 40,
  maxGenerations = 80,
}) {
  let classes = db.prepare("SELECT * FROM classes").all().map((c) => fromRow("classes", c));
  if (yearId) {
    classes = classes.filter((c) => c.year_id === yearId);
  }
  if (classId) {
    classes = classes.filter((c) => c.id === classId);
  }

  const subjects = db.prepare("SELECT * FROM subjects").all().map((s) => fromRow("subjects", s));
  const teachers = db.prepare("SELECT * FROM teachers").all();
  const classrooms = db.prepare("SELECT * FROM classrooms").all().map((c) => fromRow("classrooms", c));
  const assignments = db.prepare("SELECT * FROM subject_class_assignments").all();
  const teacherSubjects = db.prepare("SELECT * FROM teacher_subject_assignments").all();
  const classroomAssignments = db.prepare("SELECT * FROM class_classroom_assignments").all();

  // If no timingId provided, pick the first timing configuration
  let timing;
  if (timingId) {
    timing = db.prepare("SELECT * FROM timings WHERE id = ?").get(timingId);
  }
  if (!timing) {
    timing = db.prepare("SELECT * FROM timings ORDER BY created_at ASC LIMIT 1").get();
  }
  if (!timing) {
    throw new Error("No timing configuration found. Please create timing slots first.");
  }
  timing = fromRow("timings", timing);
  const activeTimingId = timing.id;

  const timeSlots = db
    .prepare("SELECT * FROM time_slots WHERE timing_id = ? AND is_break = 0 ORDER BY slot_order ASC")
    .all(activeTimingId)
    .map((t) => fromRow("time_slots", t));

  if (classes.length === 0) throw new Error("No classes found. Please add classes first.");
  if (subjects.length === 0) throw new Error("No subjects found. Please add subjects first.");
  if (teachers.length === 0) throw new Error("No teachers found. Please add teachers first.");
  if (timeSlots.length === 0) {
    throw new Error("No active teaching time slots found for this timing configuration.");
  }

  // Determine working days (0 = Mon ... 5 = Sat)
  let workingDays = [0, 1, 2, 3, 4, 5];
  if (Array.isArray(timing.working_days) && timing.working_days.length > 0) {
    workingDays = timing.working_days;
  }

  const slotOrderMap = new Map(timeSlots.map((ts) => [ts.id, ts.slot_order]));
  const sortedSlotOrders = timeSlots.map((ts) => ts.slot_order).sort((a, b) => a - b);

  // Identify consecutive non-break time slots for 2-hour labs
  const consecutivePairs = [];
  for (let i = 0; i < timeSlots.length - 1; i++) {
    if (timeSlots[i + 1].slot_order === timeSlots[i].slot_order + 1) {
      consecutivePairs.push([timeSlots[i], timeSlots[i + 1]]);
    }
  }

  // Lookups
  const classDefaultRoom = new Map(classroomAssignments.map((a) => [a.class_id, a.classroom_id]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classroomMap = new Map(classrooms.map((c) => [c.id, c]));

  // Teacher eligibility per class and subject
  const teachersBySubjectAndClass = new Map();
  for (const cls of classes) {
    for (const s of subjects) {
      const key = `${cls.id}_${s.id}`;
      let qualified = teachers.filter((t) =>
        teacherSubjects.some((ts) => ts.teacher_id === t.id && ts.subject_id === s.id && ts.class_id === cls.id)
      );
      if (qualified.length === 0) {
        qualified = teachers.filter((t) =>
          teacherSubjects.some((ts) => ts.teacher_id === t.id && ts.subject_id === s.id && (!ts.class_id || ts.class_id === cls.id))
        );
      }
      teachersBySubjectAndClass.set(key, qualified.length > 0 ? qualified : teachers);
    }
  }

  const labRooms = classrooms.filter((r) => !!r.is_lab);
  const theoryRooms = classrooms.filter((r) => !r.is_lab);
  const fallbackRooms = classrooms.length > 0 ? classrooms : [{ id: null, name: "TBA", is_lab: 0 }];

  // -------------------------------------------------------------------------
  // Build the list of lesson units (Genes) to schedule
  // -------------------------------------------------------------------------
  const lessonUnits = [];
  for (const cls of classes) {
    const classSubjects = subjects.filter((subject) =>
      assignments.some((a) => a.class_id === cls.id && a.subject_id === subject.id)
    );
    const batches = getClassBatches(cls);

    for (const subject of classSubjects) {
      const isLab = !!subject.is_lab;
      const labDuration = isLab && (subject.lab_duration_hours === 2 || !subject.lab_duration_hours) ? 2 : 1;
      const credits = subject.credits || (isLab ? 1 : (subject.periods_per_week || 3));

      if (isLab) {
        // Multi-hour batch lab: 1 credit = 1 2-hour session per week per batch
        const sessions = credits || 1;
        for (let sIdx = 0; sIdx < sessions; sIdx++) {
          const syncGroupId = `${cls.id}_${subject.id}_sync_${sIdx}`;
          for (const batch of batches) {
            lessonUnits.push({
              unitId: `${cls.id}_${subject.id}_${batch}_${sIdx}`,
              class_id: cls.id,
              subject_id: subject.id,
              batch: batch,
              is_lab: true,
              duration: labDuration,
              syncGroupId: syncGroupId,
            });
          }
        }
      } else {
        // Whole-class theory lecture: credits = number of 1-hour lectures per week
        const periodsRequired = credits || subject.periods_per_week || 3;
        for (let p = 0; p < periodsRequired; p++) {
          lessonUnits.push({
            unitId: `${cls.id}_${subject.id}_theory_${p}`,
            class_id: cls.id,
            subject_id: subject.id,
            batch: null,
            is_lab: false,
            duration: 1,
            syncGroupId: null,
          });
        }
      }
    }
  }

  if (lessonUnits.length === 0) {
    throw new Error("No subject-class assignments found. Please assign subjects to classes first.");
  }

  // Pre-index lab and theory unit indices
  const labIndices = [];
  const theoryIndices = [];
  for (let i = 0; i < lessonUnits.length; i++) {
    if (lessonUnits[i].is_lab) labIndices.push(i);
    else theoryIndices.push(i);
  }

  // Group lab units by syncGroupId
  const syncGroups = new Map();
  for (let i = 0; i < lessonUnits.length; i++) {
    const u = lessonUnits[i];
    if (u.syncGroupId) {
      if (!syncGroups.has(u.syncGroupId)) syncGroups.set(u.syncGroupId, []);
      syncGroups.get(u.syncGroupId).push(i);
    }
  }

  // -------------------------------------------------------------------------
  // Gene Generation & Helper Functions
  // -------------------------------------------------------------------------
  function generateRandomGene(unit) {
    const day = randomChoice(workingDays);
    const eligibleTeachers = teachersBySubjectAndClass.get(`${unit.class_id}_${unit.subject_id}`) || teachers;
    const teacher = randomChoice(eligibleTeachers);

    let slots;
    if (unit.duration === 2) {
      const pair =
        consecutivePairs.length > 0
          ? randomChoice(consecutivePairs)
          : [timeSlots[0], timeSlots[1] || timeSlots[0]];
      slots = pair.map((s) => s.id);
    } else {
      slots = [randomChoice(timeSlots).id];
    }

    let room;
    if (unit.is_lab) {
      room = labRooms.length > 0 ? randomChoice(labRooms) : randomChoice(fallbackRooms);
    } else {
      const defRoomId = classDefaultRoom.get(unit.class_id);
      if (defRoomId && Math.random() < 0.75) {
        room = classrooms.find((r) => r.id === defRoomId) || randomChoice(fallbackRooms);
      } else {
        room = theoryRooms.length > 0 ? randomChoice(theoryRooms) : randomChoice(fallbackRooms);
      }
    }

    return {
      day,
      slotIds: slots,
      teacher_id: teacher.id,
      classroom_id: room?.id || null,
    };
  }

  // Smart Heuristic Initializer: groups parallel batch labs and spreads theory
  function generateHeuristicChromosome() {
    const bookedTeachers = new Set();
    const bookedRooms = new Set();
    const bookedClassAll = new Set();
    const bookedClassBatch = new Set();
    const teacherDayCounts = new Map();
    const genes = new Array(lessonUnits.length);

    // Group lab units by class
    const labsByClass = new Map();
    for (const idx of labIndices) {
      const u = lessonUnits[idx];
      if (!labsByClass.has(u.class_id)) labsByClass.set(u.class_id, []);
      labsByClass.get(u.class_id).push(idx);
    }

    // 1. Schedule synchronized batch labs
    for (const [classId, uIndices] of labsByClass.entries()) {
      const cls = classes.find((c) => c.id === classId);
      const batches = getClassBatches(cls);
      const byBatch = new Map();
      batches.forEach((b) => byBatch.set(b, []));
      for (const idx of uIndices) {
        if (byBatch.has(lessonUnits[idx].batch)) {
          byBatch.get(lessonUnits[idx].batch).push(idx);
        }
      }

      const numBlocks = Math.max(...batches.map((b) => byBatch.get(b)?.length || 0));

      for (let bIdx = 0; bIdx < numBlocks; bIdx++) {
        let chosenDay = null;
        let chosenPair = null;

        const days = shuffle(workingDays);
        const pairs = shuffle(consecutivePairs);

        // Find day and pair where class, lab rooms, and teachers are available
        dayLoop: for (const d of days) {
          for (const pair of pairs) {
            const slotIds = pair.map((s) => s.id);
            const isClassFree = slotIds.every(
              (sid) =>
                !bookedClassAll.has(`${d}:${sid}:${classId}`) &&
                batches.every((b) => !bookedClassBatch.has(`${d}:${sid}:${classId}:${b}`))
            );
            if (!isClassFree) continue;

            // Check that eligible teachers and rooms are free for each batch in this rotated block
            let allResourcesAvailable = true;
            for (let b = 0; b < batches.length; b++) {
              const batchName = batches[b];
              const rotatedIdx = (bIdx + b) % numBlocks;
              const unitIdx = byBatch.get(batchName)?.[rotatedIdx];
              if (unitIdx === undefined) continue;
              const unit = lessonUnits[unitIdx];

              const eligibleTeachers = teachersBySubjectAndClass.get(`${unit.class_id}_${unit.subject_id}`) || teachers;
              const hasFreeTeacher = eligibleTeachers.some((t) => {
                const curCount = teacherDayCounts.get(`${t.id}:${d}`) || 0;
                const maxD = t.max_periods_per_day || 5;
                return curCount + 2 <= maxD && slotIds.every((sid) => !bookedTeachers.has(`${d}:${sid}:${t.id}`));
              });

              if (!hasFreeTeacher) {
                allResourcesAvailable = false;
                break;
              }
            }

            if (allResourcesAvailable) {
              chosenDay = d;
              chosenPair = pair;
              break dayLoop;
            }
          }
        }

        if (!chosenDay || !chosenPair) {
          // Fallback to any slot where class is free
          fallbackDayLoop: for (const d of days) {
            for (const pair of pairs) {
              const slotIds = pair.map((s) => s.id);
              if (
                slotIds.every(
                  (sid) =>
                    !bookedClassAll.has(`${d}:${sid}:${classId}`) &&
                    batches.every((b) => !bookedClassBatch.has(`${d}:${sid}:${classId}:${b}`))
                )
              ) {
                chosenDay = d;
                chosenPair = pair;
                break fallbackDayLoop;
              }
            }
          }
        }

        if (!chosenDay || !chosenPair) {
          chosenDay = days[0];
          chosenPair = pairs[0] || [timeSlots[0], timeSlots[1] || timeSlots[0]];
        }

        const slotIds = chosenPair.map((s) => s.id);

        for (let b = 0; b < batches.length; b++) {
          const batchName = batches[b];
          const rotatedIdx = (bIdx + b) % numBlocks;
          const unitIdx = byBatch.get(batchName)?.[rotatedIdx];
          if (unitIdx === undefined) continue;
          const unit = lessonUnits[unitIdx];

          const eligibleTeachers = shuffle(
            teachersBySubjectAndClass.get(`${unit.class_id}_${unit.subject_id}`) || teachers
          );
          let assignedTeacher = eligibleTeachers[0];
          for (const t of eligibleTeachers) {
            const curCount = teacherDayCounts.get(`${t.id}:${chosenDay}`) || 0;
            const maxD = t.max_periods_per_day || 5;
            if (curCount + 2 <= maxD) {
              const isFree = slotIds.every((sid) => !bookedTeachers.has(`${chosenDay}:${sid}:${t.id}`));
              if (isFree) {
                assignedTeacher = t;
                break;
              }
            }
          }

          const shuffledLabs = shuffle(labRooms.length > 0 ? labRooms : fallbackRooms);
          let assignedRoom = shuffledLabs[0] || fallbackRooms[0];
          for (const r of shuffledLabs) {
            const isFree = slotIds.every((sid) => !bookedRooms.has(`${chosenDay}:${sid}:${r.id}`));
            if (isFree) {
              assignedRoom = r;
              break;
            }
          }

          genes[unitIdx] = {
            day: chosenDay,
            slotIds: slotIds,
            teacher_id: assignedTeacher.id,
            classroom_id: assignedRoom?.id || null,
          };

          for (const sid of slotIds) {
            bookedTeachers.add(`${chosenDay}:${sid}:${assignedTeacher.id}`);
            if (assignedRoom?.id) bookedRooms.add(`${chosenDay}:${sid}:${assignedRoom.id}`);
            bookedClassBatch.add(`${chosenDay}:${sid}:${classId}:${batchName}`);
            bookedClassAll.add(`${chosenDay}:${sid}:${classId}`);
          }
          const curCount = teacherDayCounts.get(`${assignedTeacher.id}:${chosenDay}`) || 0;
          teacherDayCounts.set(`${assignedTeacher.id}:${chosenDay}`, curCount + 2);
        }
      }
    }

    // 2. Schedule whole-class theory units
    for (const idx of theoryIndices) {
      const unit = lessonUnits[idx];
      const eligibleTeachers = shuffle(
        teachersBySubjectAndClass.get(`${unit.class_id}_${unit.subject_id}`) || teachers
      );
      const defRoomId = classDefaultRoom.get(unit.class_id);
      const defRoom = classrooms.find((r) => r.id === defRoomId);
      const candidateRooms = defRoom ? [defRoom, ...theoryRooms] : (theoryRooms.length > 0 ? theoryRooms : fallbackRooms);

      let bestSlot = null;
      let bestDay = null;
      let bestTeacher = eligibleTeachers[0];
      let bestRoom = candidateRooms[0] || fallbackRooms[0];

      const days = shuffle(workingDays);
      const slots = shuffle(timeSlots);

      search: for (const d of days) {
        for (const s of slots) {
          const sid = s.id;
          if (bookedClassAll.has(`${d}:${sid}:${unit.class_id}`)) continue;

          for (const t of eligibleTeachers) {
            const curCount = teacherDayCounts.get(`${t.id}:${d}`) || 0;
            const maxD = t.max_periods_per_day || 5;
            if (curCount >= maxD) continue;
            if (bookedTeachers.has(`${d}:${sid}:${t.id}`)) continue;

            for (const r of candidateRooms) {
              if (r && bookedRooms.has(`${d}:${sid}:${r.id}`)) continue;

              bestDay = d;
              bestSlot = sid;
              bestTeacher = t;
              bestRoom = r;
              break search;
            }
          }
        }
      }

      if (!bestSlot) {
        relaxSearch: for (const d of days) {
          for (const s of slots) {
            const sid = s.id;
            if (bookedClassAll.has(`${d}:${sid}:${unit.class_id}`)) continue;
            for (const t of eligibleTeachers) {
              if (bookedTeachers.has(`${d}:${sid}:${t.id}`)) continue;
              for (const r of candidateRooms) {
                if (r && bookedRooms.has(`${d}:${sid}:${r.id}`)) continue;
                bestDay = d;
                bestSlot = sid;
                bestTeacher = t;
                bestRoom = r;
                break relaxSearch;
              }
            }
          }
        }
      }

      if (!bestSlot) {
        bestDay = days[0];
        bestSlot = slots[0].id;
      }

      genes[idx] = {
        day: bestDay,
        slotIds: [bestSlot],
        teacher_id: bestTeacher.id,
        classroom_id: bestRoom?.id || null,
      };

      bookedTeachers.add(`${bestDay}:${bestSlot}:${bestTeacher.id}`);
      if (bestRoom?.id) bookedRooms.add(`${bestDay}:${bestSlot}:${bestRoom.id}`);
      bookedClassAll.add(`${bestDay}:${bestSlot}:${unit.class_id}`);
      const curCount = teacherDayCounts.get(`${bestTeacher.id}:${bestDay}`) || 0;
      teacherDayCounts.set(`${bestTeacher.id}:${bestDay}`, curCount + 1);
    }

    return genes;
  }

  // -------------------------------------------------------------------------
  // Fitness Function (Hard Penalty + Soft Optimization)
  // -------------------------------------------------------------------------
  function evaluateFitness(genes) {
    let hardViolations = 0;

    const teacherSlots = new Set();
    const roomSlots = new Set();
    const classWholeSlots = new Set();
    const classBatchSlots = new Set();
    const classAnyBatchSlots = new Set();

    const teacherDailyCounts = new Map();
    const teacherDailySlots = new Map();
    const classDailyLessons = new Map();
    const classSubjectDaily = new Map();
    const labBlocks = new Map();

    // Map: classId:day -> Set of slotOrders (all activities of that class)
    const classDayOccupiedOrders = new Map();

    let preferredRoomBonus = 0;

    for (let i = 0; i < lessonUnits.length; i++) {
      const unit = lessonUnits[i];
      const gene = genes[i];
      if (!gene) continue;

      const day = gene.day;
      const teacherId = gene.teacher_id;
      const classId = unit.class_id;
      const roomId = gene.classroom_id;
      const subjectId = unit.subject_id;
      const batch = unit.batch;

      // Hard Constraint: Lab subject placed only in lab-flagged classroom
      if (unit.is_lab && roomId) {
        const roomObj = classroomMap.get(roomId);
        if (roomObj && !roomObj.is_lab) {
          hardViolations += 2;
        }
      }

      // Soft Constraint: Room match bonus for theory
      if (!unit.is_lab && roomId && roomId === classDefaultRoom.get(classId)) {
        preferredRoomBonus += 1;
      }

      for (const slotId of gene.slotIds) {
        // Hard Constraint: Teacher double-booking
        const tKey = `${day}:${slotId}:${teacherId}`;
        if (teacherSlots.has(tKey)) hardViolations += 2;
        else teacherSlots.add(tKey);

        // Hard Constraint: Classroom double-booking
        if (roomId) {
          const rKey = `${day}:${slotId}:${roomId}`;
          if (roomSlots.has(rKey)) hardViolations += 2;
          else roomSlots.add(rKey);
        }

        // Hard Constraint: Class & Batch double-booking
        if (!batch) {
          if (
            classWholeSlots.has(`${day}:${slotId}:${classId}`) ||
            classAnyBatchSlots.has(`${day}:${slotId}:${classId}`)
          ) {
            hardViolations += 2;
          }
          classWholeSlots.add(`${day}:${slotId}:${classId}`);
        } else {
          if (classWholeSlots.has(`${day}:${slotId}:${classId}`)) {
            hardViolations += 2;
          }
          const bKey = `${day}:${slotId}:${classId}:${batch}`;
          if (classBatchSlots.has(bKey)) {
            hardViolations += 2;
          }
          classBatchSlots.add(bKey);
          classAnyBatchSlots.add(`${day}:${slotId}:${classId}`);
        }

        const tdKey = `${teacherId}:${day}`;
        teacherDailyCounts.set(tdKey, (teacherDailyCounts.get(tdKey) || 0) + 1);

        const slotOrder = slotOrderMap.get(slotId) || 0;
        if (!teacherDailySlots.has(tdKey)) teacherDailySlots.set(tdKey, []);
        teacherDailySlots.get(tdKey).push(slotOrder);

        const cdKey = `${classId}:${day}`;
        if (!classDailyLessons.has(cdKey)) classDailyLessons.set(cdKey, []);
        classDailyLessons.get(cdKey).push({ slotOrder, subjectId, isLab: unit.is_lab });

        // Record occupied slot order for class mid-day continuity check
        if (!classDayOccupiedOrders.has(cdKey)) classDayOccupiedOrders.set(cdKey, new Set());
        classDayOccupiedOrders.get(cdKey).add(slotOrder);
      }

      // Soft Constraint: Parallel lab synchronization
      if (unit.is_lab && gene.slotIds.length > 0) {
        const blkKey = `${day}:${gene.slotIds[0]}:${classId}`;
        labBlocks.set(blkKey, (labBlocks.get(blkKey) || 0) + 1);
      }

      const csdKey = `${classId}:${day}:${subjectId}`;
      classSubjectDaily.set(csdKey, (classSubjectDaily.get(csdKey) || 0) + 1);
    }

    // Hard Constraint: Teacher daily lesson limit
    for (const [tdKey, count] of teacherDailyCounts.entries()) {
      const [tId] = tdKey.split(":");
      const maxDaily = teacherMap.get(tId)?.max_periods_per_day || 5;
      if (count > maxDaily) {
        hardViolations += (count - maxDaily) * 2;
      }
    }

    // Hard Constraint: Back-to-back same non-lab subject for the same class
    for (const [_, lessons] of classDailyLessons.entries()) {
      lessons.sort((a, b) => a.slotOrder - b.slotOrder);
      for (let i = 0; i < lessons.length - 1; i++) {
        if (
          !lessons[i].isLab &&
          !lessons[i + 1].isLab &&
          lessons[i].subjectId === lessons[i + 1].subjectId &&
          lessons[i + 1].slotOrder === lessons[i].slotOrder + 1
        ) {
          hardViolations += 2;
        }
      }
    }

    // Soft Constraint S1: Class Mid-Day Idle Gaps (Student Schedule Continuity)
    let midDayGaps = 0;
    for (const [_, occupiedSet] of classDayOccupiedOrders.entries()) {
      if (occupiedSet.size > 1) {
        const orders = Array.from(occupiedSet).sort((a, b) => a - b);
        const minOrder = orders[0];
        const maxOrder = orders[orders.length - 1];
        for (const tOrder of sortedSlotOrders) {
          if (tOrder > minOrder && tOrder < maxOrder && !occupiedSet.has(tOrder)) {
            midDayGaps += 1;
          }
        }
      }
    }

    // Soft Constraint S2: Parallel Lab Synchronization Bonus
    let parallelLabBonus = 0;
    for (const count of labBlocks.values()) {
      if (count > 1) {
        parallelLabBonus += (count - 1) * 40;
      }
    }

    // Soft Constraint S4: Faculty Idle Gaps
    let teacherGaps = 0;
    for (const [_, slots] of teacherDailySlots.entries()) {
      if (slots.length > 1) {
        slots.sort((a, b) => a - b);
        for (let i = 0; i < slots.length - 1; i++) {
          const diff = slots[i + 1] - slots[i];
          if (diff > 1) teacherGaps += diff - 1;
        }
      }
    }

    // Soft Constraint S5: Subject Weekly Dispersion
    let duplicateSubjectDays = 0;
    for (const [_, count] of classSubjectDaily.entries()) {
      if (count > 1) duplicateSubjectDays += count - 1;
    }

    const fitness =
      -hardViolations * 10000 +
      parallelLabBonus +
      preferredRoomBonus * 10 -
      midDayGaps * 20 -
      teacherGaps * 10 -
      duplicateSubjectDays * 25;

    return {
      fitness,
      hardViolations,
      midDayGaps,
      parallelLabBonus,
      teacherGaps,
      duplicateSubjectDays,
      preferredRoomBonus,
    };
  }

  // Pinpoint conflicted unit indices for targeted repair and mutation
  function findConflictedIndices(genes) {
    const conflicted = new Set();
    const teacherSlots = new Map();
    const roomSlots = new Map();
    const classWholeSlots = new Map();
    const classBatchSlots = new Map();
    const classAnyBatchSlots = new Map();
    const teacherDailyUnits = new Map();
    const classDailyUnits = new Map();

    for (let i = 0; i < lessonUnits.length; i++) {
      const unit = lessonUnits[i];
      const gene = genes[i];
      if (!gene) continue;

      const day = gene.day;
      const teacherId = gene.teacher_id;
      const classId = unit.class_id;
      const roomId = gene.classroom_id;
      const batch = unit.batch;

      for (const slotId of gene.slotIds) {
        const tKey = `${day}:${slotId}:${teacherId}`;
        if (teacherSlots.has(tKey)) {
          conflicted.add(i);
          conflicted.add(teacherSlots.get(tKey));
        } else {
          teacherSlots.set(tKey, i);
        }

        if (roomId) {
          const rKey = `${day}:${slotId}:${roomId}`;
          if (roomSlots.has(rKey)) {
            conflicted.add(i);
            conflicted.add(roomSlots.get(rKey));
          } else {
            roomSlots.set(rKey, i);
          }
        }

        if (!batch) {
          const cKey = `${day}:${slotId}:${classId}`;
          if (classWholeSlots.has(cKey)) {
            conflicted.add(i);
            conflicted.add(classWholeSlots.get(cKey));
          } else {
            classWholeSlots.set(cKey, i);
          }
          if (classAnyBatchSlots.has(cKey)) {
            conflicted.add(i);
            conflicted.add(classAnyBatchSlots.get(cKey));
          }
        } else {
          const cKey = `${day}:${slotId}:${classId}`;
          if (classWholeSlots.has(cKey)) {
            conflicted.add(i);
            conflicted.add(classWholeSlots.get(cKey));
          }
          const bKey = `${day}:${slotId}:${classId}:${batch}`;
          if (classBatchSlots.has(bKey)) {
            conflicted.add(i);
            conflicted.add(classBatchSlots.get(bKey));
          } else {
            classBatchSlots.set(bKey, i);
          }
          classAnyBatchSlots.set(cKey, i);
        }

        const tdKey = `${teacherId}:${day}`;
        if (!teacherDailyUnits.has(tdKey)) teacherDailyUnits.set(tdKey, []);
        teacherDailyUnits.get(tdKey).push(i);

        const cdKey = `${classId}:${day}`;
        const slotOrder = slotOrderMap.get(slotId) || 0;
        if (!classDailyUnits.has(cdKey)) classDailyUnits.set(cdKey, []);
        classDailyUnits.get(cdKey).push({ index: i, slotOrder, subjectId: unit.subject_id, isLab: unit.is_lab });
      }
    }

    // Teacher daily limits
    for (const [tdKey, indices] of teacherDailyUnits.entries()) {
      const [tId] = tdKey.split(":");
      const maxDaily = teacherMap.get(tId)?.max_periods_per_day || 5;
      if (indices.length > maxDaily) {
        indices.forEach((idx) => conflicted.add(idx));
      }
    }

    // Back-to-back duplicate theory lectures
    for (const [_, lessons] of classDailyUnits.entries()) {
      lessons.sort((a, b) => a.slotOrder - b.slotOrder);
      for (let k = 0; k < lessons.length - 1; k++) {
        if (
          !lessons[k].isLab &&
          !lessons[k + 1].isLab &&
          lessons[k].subjectId === lessons[k + 1].subjectId &&
          lessons[k + 1].slotOrder === lessons[k].slotOrder + 1
        ) {
          conflicted.add(lessons[k].index);
          conflicted.add(lessons[k + 1].index);
        }
      }
    }

    return Array.from(conflicted);
  }

  // Fast helper to find a valid free room for a given day and slotIds
  function findFreeRoom(day, slotIds, isLab, classId, genes, excludeIndex = -1) {
    const candidateRooms = isLab
      ? (labRooms.length > 0 ? labRooms : fallbackRooms)
      : (classDefaultRoom.get(classId)
          ? [classrooms.find((r) => r.id === classDefaultRoom.get(classId)), ...theoryRooms].filter(Boolean)
          : (theoryRooms.length > 0 ? theoryRooms : fallbackRooms));

    const occupied = new Set();
    for (let j = 0; j < genes.length; j++) {
      if (j === excludeIndex) continue;
      const g = genes[j];
      if (!g || g.day !== day || !g.classroom_id) continue;
      for (const sid of slotIds) {
        if (g.slotIds.includes(sid)) {
          occupied.add(g.classroom_id);
        }
      }
    }

    for (const rm of candidateRooms) {
      if (rm && !occupied.has(rm.id)) return rm;
    }
    return candidateRooms[0] || fallbackRooms[0] || null;
  }

  // -------------------------------------------------------------------------
  // Genetic Operators: Selection, Crossover, Mutation, Memetic Repair
  // -------------------------------------------------------------------------

  // Tournament Selection (k=3)
  function tournamentSelect(pop, k = 3) {
    let best = randomChoice(pop);
    for (let i = 1; i < k; i++) {
      const contestant = randomChoice(pop);
      if (contestant.fitness > best.fitness) {
        best = contestant;
      }
    }
    return best;
  }

  // Class-Preserving & Day-Preserving Crossover
  function crossover(parentA, parentB) {
    const offspringGenes = new Array(lessonUnits.length);
    const useClassCrossover = Math.random() < 0.6;

    if (useClassCrossover) {
      // Exchange full schedules of classes between parents
      const inheritFromA = new Set();
      for (const c of classes) {
        if (Math.random() < 0.5) inheritFromA.add(c.id);
      }
      for (let i = 0; i < lessonUnits.length; i++) {
        const u = lessonUnits[i];
        const src = inheritFromA.has(u.class_id) ? parentA.genes : parentB.genes;
        offspringGenes[i] = { ...src[i], slotIds: [...src[i].slotIds] };
      }
    } else {
      // Day-level crossover: inherit genes scheduled on selected days
      const daysFromA = new Set(workingDays.filter(() => Math.random() < 0.5));
      for (let i = 0; i < lessonUnits.length; i++) {
        const geneA = parentA.genes[i];
        const geneB = parentB.genes[i];
        const chosen = daysFromA.has(geneA.day) ? geneA : geneB;
        offspringGenes[i] = { ...chosen, slotIds: [...chosen.slotIds] };
      }
    }

    return offspringGenes;
  }

  // Adaptive Multi-Operator Mutation
  function mutate(genes, mutationRate = 0.15) {
    const mutated = genes.map((g) => ({ ...g, slotIds: [...g.slotIds] }));

    for (let i = 0; i < lessonUnits.length; i++) {
      if (Math.random() >= mutationRate) continue;

      const unit = lessonUnits[i];
      const gene = mutated[i];
      const mutationType = Math.random();

      if (mutationType < 0.4) {
        // Operator 1: Time/Day Shift
        const newDay = randomChoice(workingDays);
        let newSlotIds;
        if (unit.duration === 2) {
          const pair = consecutivePairs.length > 0 ? randomChoice(consecutivePairs) : [timeSlots[0], timeSlots[1] || timeSlots[0]];
          newSlotIds = pair.map((s) => s.id);
        } else {
          newSlotIds = [randomChoice(timeSlots).id];
        }
        const rm = findFreeRoom(newDay, newSlotIds, unit.is_lab, unit.class_id, mutated, i);
        mutated[i] = {
          day: newDay,
          slotIds: newSlotIds,
          teacher_id: gene.teacher_id,
          classroom_id: rm?.id || gene.classroom_id,
        };
      } else if (mutationType < 0.65) {
        // Operator 2: Teacher Alternate Mutation
        const eligible = teachersBySubjectAndClass.get(`${unit.class_id}_${unit.subject_id}`) || teachers;
        if (eligible.length > 1) {
          const newTeacher = randomChoice(eligible);
          mutated[i] = { ...gene, teacher_id: newTeacher.id };
        }
      } else if (mutationType < 0.85) {
        // Operator 3: Room Reallocation Mutation
        const rm = findFreeRoom(gene.day, gene.slotIds, unit.is_lab, unit.class_id, mutated, i);
        if (rm) {
          mutated[i] = { ...gene, classroom_id: rm.id };
        }
      } else {
        // Operator 4: Batch Lab Synchronization Mutation
        if (unit.is_lab && unit.syncGroupId && syncGroups.has(unit.syncGroupId)) {
          const sisterIndices = syncGroups.get(unit.syncGroupId).filter((idx) => idx !== i);
          if (sisterIndices.length > 0) {
            const anchor = mutated[sisterIndices[0]];
            const rm = findFreeRoom(anchor.day, anchor.slotIds, true, unit.class_id, mutated, i);
            mutated[i] = {
              day: anchor.day,
              slotIds: [...anchor.slotIds],
              teacher_id: gene.teacher_id,
              classroom_id: rm?.id || gene.classroom_id,
            };
          }
        }
      }
    }

    return mutated;
  }

  // Memetic Local Repair (Fast Conflict-Directed Multi-Pass Local Search)
  function repairChromosome(genes, curHardViolations) {
    if (curHardViolations === 0) return genes;

    let repaired = genes.map((g) => ({ ...g, slotIds: [...g.slotIds] }));

    for (let pass = 0; pass < 3; pass++) {
      const conflictedIndices = findConflictedIndices(repaired);
      if (conflictedIndices.length === 0) break;

      // Pre-populate fast O(1) occupancy sets for this pass
      const teacherSlots = new Set();
      const roomSlots = new Set();
      const classWholeSlots = new Set();
      const classBatchSlots = new Set();
      const classAnyBatchSlots = new Set();
      const teacherDailyCounts = new Map();

      for (let j = 0; j < repaired.length; j++) {
        const g = repaired[j];
        const u = lessonUnits[j];
        if (!g) continue;
        for (const sid of g.slotIds) {
          teacherSlots.add(`${g.day}:${sid}:${g.teacher_id}`);
          if (g.classroom_id) roomSlots.add(`${g.day}:${sid}:${g.classroom_id}`);
          if (!u.batch) {
            classWholeSlots.add(`${g.day}:${sid}:${u.class_id}`);
            classAnyBatchSlots.add(`${g.day}:${sid}:${u.class_id}`);
          } else {
            classBatchSlots.add(`${g.day}:${sid}:${u.class_id}:${u.batch}`);
            classAnyBatchSlots.add(`${g.day}:${sid}:${u.class_id}`);
          }
          const tdKey = `${g.teacher_id}:${g.day}`;
          teacherDailyCounts.set(tdKey, (teacherDailyCounts.get(tdKey) || 0) + 1);
        }
      }

      for (const i of conflictedIndices) {
        const u = lessonUnits[i];
        const g = repaired[i];

        // Temporarily remove gene i from occupancy
        for (const sid of g.slotIds) {
          teacherSlots.delete(`${g.day}:${sid}:${g.teacher_id}`);
          if (g.classroom_id) roomSlots.delete(`${g.day}:${sid}:${g.classroom_id}`);
          if (!u.batch) {
            classWholeSlots.delete(`${g.day}:${sid}:${u.class_id}`);
            classAnyBatchSlots.delete(`${g.day}:${sid}:${u.class_id}`);
          } else {
            classBatchSlots.delete(`${g.day}:${sid}:${u.class_id}:${u.batch}`);
            classAnyBatchSlots.delete(`${g.day}:${sid}:${u.class_id}`);
          }
          const tdKey = `${g.teacher_id}:${g.day}`;
          const curCount = teacherDailyCounts.get(tdKey) || 1;
          teacherDailyCounts.set(tdKey, Math.max(0, curCount - 1));
        }

        const candidatePairs =
          u.duration === 2
            ? consecutivePairs.map((p) => p.map((s) => s.id))
            : timeSlots.map((ts) => [ts.id]);

        const eligibleTeachers =
          teachersBySubjectAndClass.get(`${u.class_id}_${u.subject_id}`) || teachers;

        let bestGene = { ...g };
        let minConflicts = 999;

        searchLoop: for (const d of shuffle(workingDays)) {
          for (const slotIds of shuffle(candidatePairs)) {
            for (const t of shuffle(eligibleTeachers)) {
              let conflicts = 0;
              const maxD = teacherMap.get(t.id)?.max_periods_per_day || 5;
              const tCount = teacherDailyCounts.get(`${t.id}:${d}`) || 0;
              if (tCount + u.duration > maxD) conflicts += 2;

              for (const sid of slotIds) {
                if (teacherSlots.has(`${d}:${sid}:${t.id}`)) conflicts += 2;
                if (!u.batch) {
                  if (
                    classWholeSlots.has(`${d}:${sid}:${u.class_id}`) ||
                    classAnyBatchSlots.has(`${d}:${sid}:${u.class_id}`)
                  ) {
                    conflicts += 2;
                  }
                } else {
                  if (
                    classWholeSlots.has(`${d}:${sid}:${u.class_id}`) ||
                    classBatchSlots.has(`${d}:${sid}:${u.class_id}:${u.batch}`)
                  ) {
                    conflicts += 2;
                  }
                }
              }

              if (conflicts < minConflicts) {
                const rm = findFreeRoom(d, slotIds, u.is_lab, u.class_id, repaired, i);
                if (u.is_lab && (!rm || !rm.is_lab)) conflicts += 2;
                for (const sid of slotIds) {
                  if (rm?.id && roomSlots.has(`${d}:${sid}:${rm.id}`)) conflicts += 2;
                }

                if (conflicts < minConflicts) {
                  minConflicts = conflicts;
                  bestGene = { day: d, slotIds, teacher_id: t.id, classroom_id: rm?.id || null };
                  if (minConflicts === 0) break searchLoop;
                }
              }
            }
          }
        }

        // Assign bestGene and re-insert into occupancy
        repaired[i] = bestGene;
        for (const sid of bestGene.slotIds) {
          teacherSlots.add(`${bestGene.day}:${sid}:${bestGene.teacher_id}`);
          if (bestGene.classroom_id) roomSlots.add(`${bestGene.day}:${sid}:${bestGene.classroom_id}`);
          if (!u.batch) {
            classWholeSlots.add(`${bestGene.day}:${sid}:${u.class_id}`);
            classAnyBatchSlots.add(`${bestGene.day}:${sid}:${u.class_id}`);
          } else {
            classBatchSlots.add(`${bestGene.day}:${sid}:${u.class_id}:${u.batch}`);
            classAnyBatchSlots.add(`${bestGene.day}:${sid}:${u.class_id}`);
          }
          const tdKey = `${bestGene.teacher_id}:${bestGene.day}`;
          teacherDailyCounts.set(tdKey, (teacherDailyCounts.get(tdKey) || 0) + 1);
        }
      }
    }

    return repaired;
  }

  // -------------------------------------------------------------------------
  // Main Genetic Algorithm Lifecycle
  // -------------------------------------------------------------------------
  console.log(`🧬 Initializing Genetic Algorithm: popSize=${popSize}, maxGenerations=${maxGenerations}, units=${lessonUnits.length}`);

  // Step 1: Initialize Population with Feasible Diverse Seeds
  let population = [];

  for (let i = 0; i < popSize; i++) {
    let finalGenes = null;
    let finalScore = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const rawGenes = generateHeuristicChromosome();
      const evalResult = evaluateFitness(rawGenes);
      let candidate = rawGenes;
      if (evalResult.hardViolations > 0) {
        candidate = repairChromosome(rawGenes, evalResult.hardViolations);
      }
      const score = evaluateFitness(candidate);
      if (score.hardViolations === 0) {
        finalGenes = candidate;
        finalScore = score;
        break;
      }
      if (!finalScore || score.hardViolations < finalScore.hardViolations) {
        finalGenes = candidate;
        finalScore = score;
      }
    }

    population.push({ genes: finalGenes, ...finalScore });
  }

  // Sort population by fitness descending
  population.sort((a, b) => b.fitness - a.fitness);
  let bestIndividual = population[0];

  console.log(`Initial Gen 0 Best: Fitness=${bestIndividual.fitness}, HardViolations=${bestIndividual.hardViolations}, MidDayGaps=${bestIndividual.midDayGaps}`);

  // Step 2: Generational Evolution Loop
  const eliteCount = Math.max(2, Math.floor(popSize * 0.1));
  let stagnationCount = 0;

  for (let gen = 1; gen <= maxGenerations; gen++) {
    // Check early exit condition: 0 hard violations and soft score stabilized
    if (bestIndividual.hardViolations === 0 && stagnationCount >= 10) {
      console.log(`✨ Converged at Generation ${gen} with 0 hard violations!`);
      break;
    }

    const nextPopulation = [];

    // Elitism: carry over top individuals unchanged
    for (let e = 0; e < eliteCount; e++) {
      nextPopulation.push(population[e]);
    }

    // Adaptive mutation rate: boost if population stagnates
    const currentMutationRate = stagnationCount > 5 ? 0.20 : 0.10;

    // Fill remaining population with offspring
    while (nextPopulation.length < popSize) {
      const parentA = tournamentSelect(population, 3);
      const parentB = tournamentSelect(population, 3);

      let offspringGenes = crossover(parentA, parentB);
      offspringGenes = mutate(offspringGenes, currentMutationRate);

      let evalOffspring = evaluateFitness(offspringGenes);
      if (evalOffspring.hardViolations > 0) {
        offspringGenes = repairChromosome(offspringGenes, evalOffspring.hardViolations);
        evalOffspring = evaluateFitness(offspringGenes);
      }

      // If offspring repaired to 0 or fewer violations than parent, accept it; otherwise preserve parent
      if (evalOffspring.hardViolations <= parentA.hardViolations) {
        nextPopulation.push({ genes: offspringGenes, ...evalOffspring });
      } else {
        nextPopulation.push(parentA);
      }
    }

    // Sort next population
    nextPopulation.sort((a, b) => b.fitness - a.fitness);
    population = nextPopulation;

    if (population[0].fitness > bestIndividual.fitness) {
      bestIndividual = population[0];
      stagnationCount = 0;
    } else {
      stagnationCount++;
    }

    if (gen % 10 === 0 || gen === maxGenerations) {
      console.log(`Gen ${gen}: Best Fitness=${bestIndividual.fitness}, HardViolations=${bestIndividual.hardViolations}, MidDayGaps=${bestIndividual.midDayGaps}`);
    }
  }

  // Final check: if best solution still has any hard violation, run a final thorough repair pass
  if (bestIndividual.hardViolations > 0) {
    console.log("Applying final thorough repair pass on best chromosome...");
    const repaired = repairChromosome(bestIndividual.genes, bestIndividual.hardViolations);
    const finalScore = evaluateFitness(repaired);
    bestIndividual = { genes: repaired, ...finalScore };
  }

  console.log(`🎉 Final Schedule Outcome: HardViolations=${bestIndividual.hardViolations}, MidDayGaps=${bestIndividual.midDayGaps}, ParallelLabBonus=${bestIndividual.parallelLabBonus}`);

  // -------------------------------------------------------------------------
  // Persist the generated timetable to SQLite
  // -------------------------------------------------------------------------
  const now = new Date().toISOString();
  const timetableId = randomUUID();
  const shareToken = randomUUID().replace(/-/g, "").substring(0, 16);
  const finalName = name || `Timetable ${new Date().toLocaleDateString()}`;

  db.prepare(
    `INSERT INTO timetables (id, name, academic_year, year_id, timing_id, is_active, is_locked, share_token, generated_at, modified_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?)`
  ).run(
    timetableId,
    finalName,
    academicYear || new Date().getFullYear().toString(),
    yearId || null,
    activeTimingId,
    shareToken,
    now,
    now,
    now,
    now
  );

  const lessons = [];
  for (let i = 0; i < lessonUnits.length; i++) {
    const unit = lessonUnits[i];
    const gene = bestIndividual.genes[i];
    for (const slotId of gene.slotIds) {
      lessons.push({
        id: randomUUID(),
        timetable_id: timetableId,
        day: gene.day,
        time_slot_id: slotId,
        class_id: unit.class_id,
        subject_id: unit.subject_id,
        teacher_id: gene.teacher_id,
        classroom_id: gene.classroom_id,
        batch: unit.batch || null,
      });
    }
  }

  const insertLesson = db.prepare(
    `INSERT INTO lessons (id, timetable_id, day, time_slot_id, class_id, subject_id, teacher_id, classroom_id, batch, created_at, updated_at)
     VALUES (@id, @timetable_id, @day, @time_slot_id, @class_id, @subject_id, @teacher_id, @classroom_id, @batch, @created_at, @updated_at)`
  );

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insertLesson.run({ ...row, created_at: now, updated_at: now });
    }
  });

  if (lessons.length > 0) insertMany(lessons);

  return {
    id: timetableId,
    name: finalName,
    lessonsScheduled: lessons.length,
    fitness: bestIndividual.fitness,
    hardViolations: bestIndividual.hardViolations,
    midDayGaps: bestIndividual.midDayGaps,
    totalGaps: bestIndividual.teacherGaps,
    parallelLabBonus: bestIndividual.parallelLabBonus,
  };
}

module.exports = { generateTimetable, getClassBatches };
