// generator.js — Genetic Algorithm (GA) timetable generation engine for ACADSYNC.
//
// Implements Section 6.3 of the Scope Document with Institutional Batch Lab support:
// - Whole-class theory lectures attend together in lecture classrooms.
// - Laboratory courses are divided into batches (e.g. Batch A, Batch B, Batch C)
//   allowing concurrent, parallel lab sessions for different subjects in specialized labs.
// - Individual batches can also have standalone lab sessions without conflicts.
//
// Hard constraints:
// 1. No teacher double-booked in the same slot.
// 2. No class or batch double-booked in the same slot (distinct batches can run concurrently).
// 3. No classroom/lab double-booked in the same slot.
// 4. No back-to-back repeat of the same theory lecture for the same class.
// 5. No teacher exceeding their maximum daily lesson count.
// 6. Lab subjects placed only in lab-flagged classrooms.
//
// Soft constraints:
// 1. Parallel lab bonus (encourage batches of same class to synchronize lab windows).
// 2. Teacher gap count (minimize idle periods between classes on any day).
// 3. Subject distribution (avoid clustering same non-lab subject on the same day).
// 4. Room-utilization balance (prefer assigned default classroom for theory).

const { randomUUID } = require("crypto");
const { db, fromRow } = require("../db");

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
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

function generateTimetable({ name, academicYear, yearId, timingId, popSize = 40, maxGenerations = 80 }) {
  const classes = db.prepare("SELECT * FROM classes").all().map((c) => fromRow("classes", c));
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

  // Identify consecutive non-break time slots for 2-hour labs
  const consecutivePairs = [];
  for (let i = 0; i < timeSlots.length - 1; i++) {
    if (timeSlots[i + 1].slot_order === timeSlots[i].slot_order + 1) {
      consecutivePairs.push([timeSlots[i], timeSlots[i + 1]]);
    }
  }

  // Pre-index lookups
  const classDefaultRoom = new Map(classroomAssignments.map((a) => [a.class_id, a.classroom_id]));
  
  // Specific teacher assignments per Class & Subject
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

  // Build the list of lesson units (genes) that need to be scheduled
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
        for (const batch of batches) {
          for (let sIdx = 0; sIdx < sessions; sIdx++) {
            lessonUnits.push({
              unitId: `${cls.id}_${subject.id}_${batch}_${sIdx}`,
              class_id: cls.id,
              subject_id: subject.id,
              batch: batch,
              is_lab: true,
              duration: labDuration,
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
          });
        }
      }
    }
  }

  if (lessonUnits.length === 0) {
    throw new Error("No subject-class assignments found. Please assign subjects to classes first.");
  }

  // Generate a random gene placement for a lesson unit
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
      if (defRoomId && Math.random() < 0.7) {
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

  // Smart conflict-aware initializer that schedules parallel batch lab blocks
  function generateSmartChromosome() {
    const bookedTeachers = new Set();
    const bookedRooms = new Set();
    const bookedClassAll = new Set();
    const bookedClassBatch = new Set();
    const teacherDayCounts = new Map();

    const genes = new Array(lessonUnits.length);

    const labIndices = [];
    const theoryIndices = [];
    for (let i = 0; i < lessonUnits.length; i++) {
      if (lessonUnits[i].is_lab) labIndices.push(i);
      else theoryIndices.push(i);
    }

    // Group lab units by class
    const labsByClass = new Map();
    for (const idx of labIndices) {
      const u = lessonUnits[idx];
      if (!labsByClass.has(u.class_id)) labsByClass.set(u.class_id, []);
      labsByClass.get(u.class_id).push(idx);
    }

    // Place lab batches into synchronized 2-hour consecutive pairs
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

        const days = [...workingDays].sort(() => Math.random() - 0.5);
        const pairs = [...consecutivePairs].sort(() => Math.random() - 0.5);

        dayLoop: for (const d of days) {
          for (const pair of pairs) {
            const slotIds = pair.map((s) => s.id);
            const isClassFree = slotIds.every(
              (sid) =>
                !bookedClassAll.has(`${d}:${sid}:${classId}`) &&
                batches.every((b) => !bookedClassBatch.has(`${d}:${sid}:${classId}:${b}`))
            );
            if (isClassFree) {
              chosenDay = d;
              chosenPair = pair;
              break dayLoop;
            }
          }
        }

        if (!chosenDay || !chosenPair) {
          chosenDay = days[0];
          chosenPair = pairs[0];
        }

        const slotIds = chosenPair.map((s) => s.id);

        for (const b of batches) {
          const unitIdx = byBatch.get(b)?.[bIdx];
          if (unitIdx === undefined) continue;
          const unit = lessonUnits[unitIdx];

          const eligibleTeachers = (
            teachersBySubjectAndClass.get(`${unit.class_id}_${unit.subject_id}`) || teachers
          ).sort(() => Math.random() - 0.5);
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

          const shuffledLabs = [...labRooms].sort(() => Math.random() - 0.5);
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
            bookedClassBatch.add(`${chosenDay}:${sid}:${classId}:${b}`);
            bookedClassAll.add(`${chosenDay}:${sid}:${classId}`);
          }
          const curCount = teacherDayCounts.get(`${assignedTeacher.id}:${chosenDay}`) || 0;
          teacherDayCounts.set(`${assignedTeacher.id}:${chosenDay}`, curCount + 2);
        }
      }
    }

    // Schedule whole-class theory units
    for (const idx of theoryIndices) {
      const unit = lessonUnits[idx];
      const eligibleTeachers = (
        teachersBySubjectAndClass.get(`${unit.class_id}_${unit.subject_id}`) || teachers
      ).sort(() => Math.random() - 0.5);
      const defRoomId = classDefaultRoom.get(unit.class_id);
      const defRoom = classrooms.find((r) => r.id === defRoomId);
      const candidateRooms = defRoom ? [defRoom, ...theoryRooms] : theoryRooms;

      let bestSlot = null;
      let bestDay = null;
      let bestTeacher = eligibleTeachers[0];
      let bestRoom = candidateRooms[0] || fallbackRooms[0];

      const days = [...workingDays].sort(() => Math.random() - 0.5);
      const slots = [...timeSlots].sort(() => Math.random() - 0.5);

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
        // Secondary pass: find ANY slot where class and teacher are free
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
        // Tertiary pass: any slot where class is free
        tertiarySearch: for (const d of days) {
          for (const s of slots) {
            const sid = s.id;
            if (!bookedClassAll.has(`${d}:${sid}:${unit.class_id}`)) {
              bestDay = d;
              bestSlot = sid;
              bestTeacher = eligibleTeachers[0];
              bestRoom = candidateRooms[0] || fallbackRooms[0];
              break tertiarySearch;
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

  // Fitness function evaluating hard & soft constraints
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  function evaluateFitness(genes) {
    let hardViolations = 0;

    const teacherSlots = new Set();
    const roomSlots = new Set();
    const classWholeSlots = new Set();
    const classBatchSlots = new Set();
    const classAnyBatchSlots = new Set();

    const teacherDailyCounts = new Map();
    const classSubjectDaily = new Map();
    const classDailyLessons = new Map();
    const teacherDailySlots = new Map();
    const labBlocks = new Map();

    let preferredRoomBonus = 0;

    for (let i = 0; i < lessonUnits.length; i++) {
      const unit = lessonUnits[i];
      const gene = genes[i];
      const day = gene.day;
      const teacherId = gene.teacher_id;
      const classId = unit.class_id;
      const roomId = gene.classroom_id;
      const subjectId = unit.subject_id;
      const batch = unit.batch;

      // Hard constraint 6: Lab subject placed only in lab-flagged classroom
      if (unit.is_lab && roomId) {
        const roomObj = classrooms.find((r) => r.id === roomId);
        if (roomObj && !roomObj.is_lab) {
          hardViolations += 2;
        }
      }

      // Soft constraint 4: Room match bonus for theory
      if (!unit.is_lab && roomId && roomId === classDefaultRoom.get(classId)) {
        preferredRoomBonus += 1;
      }

      for (const slotId of gene.slotIds) {
        // Hard constraint 1: Teacher double-booking
        const tKey = `${day}:${slotId}:${teacherId}`;
        if (teacherSlots.has(tKey)) hardViolations += 2;
        else teacherSlots.add(tKey);

        // Hard constraint 3: Classroom double-booking
        if (roomId) {
          const rKey = `${day}:${slotId}:${roomId}`;
          if (roomSlots.has(rKey)) hardViolations += 2;
          else roomSlots.add(rKey);
        }

        // Hard constraint 2: Class & Batch double-booking
        if (!batch) {
          // Whole-class lecture: cannot overlap with another whole-class lecture OR any batch lab
          if (
            classWholeSlots.has(`${day}:${slotId}:${classId}`) ||
            classAnyBatchSlots.has(`${day}:${slotId}:${classId}`)
          ) {
            hardViolations += 2;
          }
          classWholeSlots.add(`${day}:${slotId}:${classId}`);
        } else {
          // Batch lab:
          // 1. Conflict if whole class is having a lecture
          if (classWholeSlots.has(`${day}:${slotId}:${classId}`)) {
            hardViolations += 2;
          }
          // 2. Conflict if this specific batch is already booked
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
      }

      // Soft constraint: Parallel lab bonus
      if (unit.is_lab && gene.slotIds.length > 0) {
        const blkKey = `${day}:${gene.slotIds[0]}:${classId}`;
        labBlocks.set(blkKey, (labBlocks.get(blkKey) || 0) + 1);
      }

      const csdKey = `${classId}:${day}:${subjectId}`;
      classSubjectDaily.set(csdKey, (classSubjectDaily.get(csdKey) || 0) + 1);
    }

    // Hard constraint 5: Teacher daily lesson limit
    for (const [tdKey, count] of teacherDailyCounts.entries()) {
      const [tId] = tdKey.split(":");
      const maxDaily = teacherMap.get(tId)?.max_periods_per_day || 5;
      if (count > maxDaily) {
        hardViolations += (count - maxDaily) * 2;
      }
    }

    // Hard constraint 4: Back-to-back same non-lab subject for the same class
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

    // Soft constraint 1: Teacher gaps
    let totalGaps = 0;
    for (const [_, slots] of teacherDailySlots.entries()) {
      if (slots.length > 1) {
        slots.sort((a, b) => a - b);
        for (let i = 0; i < slots.length - 1; i++) {
          const diff = slots[i + 1] - slots[i];
          if (diff > 1) totalGaps += diff - 1;
        }
      }
    }

    // Soft constraint: Parallel lab synchronization bonus
    let parallelLabBonus = 0;
    for (const count of labBlocks.values()) {
      if (count > 1) {
        parallelLabBonus += (count - 1) * 35;
      }
    }

    // Soft constraint 2 & 3: Subject distribution across days
    let duplicateSubjectDays = 0;
    for (const [_, count] of classSubjectDaily.entries()) {
      if (count > 1) duplicateSubjectDays += count - 1;
    }

    const fitness =
      -hardViolations * 1000 +
      parallelLabBonus -
      totalGaps * 10 -
      duplicateSubjectDays * 20 +
      preferredRoomBonus * 5;

    return {
      fitness,
      hardViolations,
      totalGaps,
      duplicateSubjectDays,
      parallelLabBonus,
    };
  }

  // Helper to pinpoint which unit indices are involved in collisions
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

    // Back to back duplicate theory lectures
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

  // Fast helper to find a valid room for a given day and slotIds
  function findFreeRoom(day, slotIds, isLab, classId, genes, excludeIndex = -1) {
    const candidateRooms = isLab
      ? labRooms
      : (classDefaultRoom.get(classId)
          ? [classrooms.find((r) => r.id === classDefaultRoom.get(classId)), ...theoryRooms].filter(Boolean)
          : theoryRooms);

    // Collect occupied rooms during this day and slotIds
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
    return fallbackRooms[0] || candidateRooms[0] || null;
  }

  // Generate candidate solutions and perform fast conflict-directed repair until 0 violations
  let bestSolution = null;
  const maxAttempts = 25;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidateGenes = generateSmartChromosome();
    let curScore = evaluateFitness(candidateGenes);
    let repaired = candidateGenes;

    if (curScore.hardViolations > 0) {
      repaired = candidateGenes.map((g) => ({ ...g, slotIds: [...g.slotIds] }));
      for (let pass = 1; pass <= 3 && curScore.hardViolations > 0; pass++) {
        const conflictedIndices = findConflictedIndices(repaired);
        if (conflictedIndices.length === 0) break;

        let improved = false;
        for (const i of conflictedIndices) {
          if (curScore.hardViolations === 0) break;
          const unit = lessonUnits[i];
          const gene = repaired[i];

          const candidatePairs =
            unit.duration === 2
              ? consecutivePairs.map((p) => p.map((s) => s.id))
              : timeSlots.map((ts) => [ts.id]);

          const eligibleTeachers =
            teachersBySubjectAndClass.get(`${unit.class_id}_${unit.subject_id}`) || teachers;

          let bestLocalGene = { ...gene };
          let minLocalViolations = curScore.hardViolations;

          searchLoop: for (const day of workingDays) {
            for (const slotIds of candidatePairs) {
              for (const t of eligibleTeachers) {
                const rm = findFreeRoom(day, slotIds, unit.is_lab, unit.class_id, repaired, i);
                repaired[i] = { day, slotIds, teacher_id: t.id, classroom_id: rm?.id || null };
                const ev = evaluateFitness(repaired);
                if (ev.hardViolations < minLocalViolations) {
                  minLocalViolations = ev.hardViolations;
                  bestLocalGene = { day, slotIds, teacher_id: t.id, classroom_id: rm?.id || null };
                  improved = true;
                  if (minLocalViolations === 0) break searchLoop;
                }
              }
            }
          }

          repaired[i] = bestLocalGene;
          curScore = evaluateFitness(repaired);
        }
        if (!improved) break;
      }
    }

    const solution = { genes: repaired, ...curScore };
    if (
      !bestSolution ||
      solution.hardViolations < bestSolution.hardViolations ||
      (solution.hardViolations === bestSolution.hardViolations && solution.fitness > bestSolution.fitness)
    ) {
      bestSolution = solution;
    }

    if (bestSolution.hardViolations === 0) {
      break;
    }
  }

  // --- Persist the generated timetable to SQLite ---
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
    const gene = bestSolution.genes[i];
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
    fitness: bestSolution.fitness,
    hardViolations: bestSolution.hardViolations,
    totalGaps: bestSolution.totalGaps,
    parallelLabBonus: bestSolution.parallelLabBonus,
  };
}

module.exports = { generateTimetable, getClassBatches };
