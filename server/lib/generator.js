// generator.js — Genetic Algorithm (GA) timetable generation engine for ACADSYNC.
//
// Implements Section 6.3 of the Scope Document:
// Searches a population of candidate weekly timetables and evolves toward one
// that satisfies every hard constraint and scores well on soft-constraint quality.
//
// Hard constraints:
// 1. No teacher double-booked in the same slot.
// 2. No class double-booked in the same slot.
// 3. No classroom double-booked in the same slot.
// 4. No back-to-back repeat of the same subject/teacher/class combination.
// 5. No teacher exceeding their maximum daily lesson count.
// 6. Lab subjects placed only in lab-flagged classrooms.
//
// Soft constraints:
// 1. Teacher gap count (minimize idle periods between classes on any day).
// 2. Uneven daily load across teachers (balance teacher load across working days).
// 3. Subject distribution (avoid clustering same non-lab subject on the same day).
// 4. Room-utilization balance (prefer assigned default classroom for classes).

const { randomUUID } = require("crypto");
const { db, fromRow } = require("../db");

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTimetable({ name, academicYear, yearId, timingId, popSize = 40, maxGenerations = 80 }) {
  const classes = db.prepare("SELECT * FROM classes").all();
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
  const teachersBySubject = new Map();
  for (const s of subjects) {
    const qualified = teachers.filter((t) =>
      teacherSubjects.some((ts) => ts.teacher_id === t.id && ts.subject_id === s.id)
    );
    teachersBySubject.set(s.id, qualified.length > 0 ? qualified : teachers);
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

    for (const subject of classSubjects) {
      const periodsRequired = subject.periods_per_week || 3;
      const isLab = !!subject.is_lab;
      const labDuration = isLab && subject.lab_duration_hours === 2 ? 2 : 1;

      if (labDuration === 2) {
        // Multi-hour lab: 1 unit spans 2 consecutive periods
        lessonUnits.push({
          unitId: `${cls.id}_${subject.id}_lab`,
          class_id: cls.id,
          subject_id: subject.id,
          is_lab: true,
          duration: 2,
        });
        for (let p = 2; p < periodsRequired; p += 2) {
          lessonUnits.push({
            unitId: `${cls.id}_${subject.id}_lab_${p}`,
            class_id: cls.id,
            subject_id: subject.id,
            is_lab: true,
            duration: 2,
          });
        }
      } else {
        for (let p = 0; p < periodsRequired; p++) {
          lessonUnits.push({
            unitId: `${cls.id}_${subject.id}_${p}`,
            class_id: cls.id,
            subject_id: subject.id,
            is_lab: isLab,
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
    const eligibleTeachers = teachersBySubject.get(unit.subject_id) || teachers;
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

  // Fitness function evaluating hard & soft constraints
  function evaluateFitness(genes) {
    let hardViolations = 0;

    const teacherSlots = new Set();
    const classSlots = new Set();
    const roomSlots = new Set();

    const teacherDailyCounts = new Map();
    const classSubjectDaily = new Map();
    const classDailyLessons = new Map();
    const teacherDailySlots = new Map();

    let preferredRoomBonus = 0;

    for (let i = 0; i < lessonUnits.length; i++) {
      const unit = lessonUnits[i];
      const gene = genes[i];
      const day = gene.day;
      const teacherId = gene.teacher_id;
      const classId = unit.class_id;
      const roomId = gene.classroom_id;
      const subjectId = unit.subject_id;

      // Hard constraint 6: Lab subject placed only in lab-flagged classroom
      if (unit.is_lab && roomId) {
        const roomObj = classrooms.find((r) => r.id === roomId);
        if (roomObj && !roomObj.is_lab) {
          hardViolations += 2;
        }
      }

      // Soft constraint 4: Room match bonus
      if (!unit.is_lab && roomId && roomId === classDefaultRoom.get(classId)) {
        preferredRoomBonus += 1;
      }

      for (const slotId of gene.slotIds) {
        // Hard constraint 1: Teacher double-booking
        const tKey = `${day}:${slotId}:${teacherId}`;
        if (teacherSlots.has(tKey)) hardViolations += 2;
        else teacherSlots.add(tKey);

        // Hard constraint 2: Class double-booking
        const cKey = `${day}:${slotId}:${classId}`;
        if (classSlots.has(cKey)) hardViolations += 2;
        else classSlots.add(cKey);

        // Hard constraint 3: Classroom double-booking
        if (roomId) {
          const rKey = `${day}:${slotId}:${roomId}`;
          if (roomSlots.has(rKey)) hardViolations += 2;
          else roomSlots.add(rKey);
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

      const csdKey = `${classId}:${day}:${subjectId}`;
      classSubjectDaily.set(csdKey, (classSubjectDaily.get(csdKey) || 0) + 1);
    }

    // Hard constraint 5: Teacher daily lesson limit
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));
    for (const [tdKey, count] of teacherDailyCounts.entries()) {
      const [tId] = tdKey.split(":");
      const maxDaily = teacherMap.get(tId)?.max_periods_per_day || 4;
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
          if (diff > 1) {
            totalGaps += diff - 1;
          }
        }
      }
    }

    // Soft constraint 2 & 3: Subject distribution across days (penalize multiple theory lectures on same day)
    let duplicateSubjectDays = 0;
    for (const [_, count] of classSubjectDaily.entries()) {
      if (count > 1) duplicateSubjectDays += count - 1;
    }

    const fitness =
      -hardViolations * 1000 -
      totalGaps * 15 -
      duplicateSubjectDays * 25 +
      preferredRoomBonus * 5;

    return {
      fitness,
      hardViolations,
      totalGaps,
      duplicateSubjectDays,
    };
  }

  // --- Run Genetic Algorithm Evolution Loop ---
  let population = [];
  for (let p = 0; p < popSize; p++) {
    const genes = lessonUnits.map((u) => generateRandomGene(u));
    const score = evaluateFitness(genes);
    population.push({ genes, ...score });
  }

  population.sort((a, b) => b.fitness - a.fitness);
  let bestSolution = population[0];
  let plateauCount = 0;
  const elitismCount = 2;
  const mutationRate = 0.15;

  for (let gen = 0; gen < maxGenerations; gen++) {
    if (bestSolution.hardViolations === 0) {
      plateauCount++;
      if (plateauCount >= 12) break; // Terminate early when conflict-free & plateau reached
    }

    const nextGen = [];

    // Elitism: retain top individuals
    for (let e = 0; e < elitismCount; e++) {
      nextGen.push(population[e]);
    }

    // Tournament selection
    const selectParent = () => {
      const i1 = Math.floor(Math.random() * popSize);
      const i2 = Math.floor(Math.random() * popSize);
      const i3 = Math.floor(Math.random() * popSize);
      let best = population[i1];
      if (population[i2].fitness > best.fitness) best = population[i2];
      if (population[i3].fitness > best.fitness) best = population[i3];
      return best;
    };

    while (nextGen.length < popSize) {
      const parent1 = selectParent();
      const parent2 = selectParent();

      // Uniform crossover
      const childGenes = [];
      for (let i = 0; i < lessonUnits.length; i++) {
        childGenes.push(Math.random() < 0.5 ? { ...parent1.genes[i] } : { ...parent2.genes[i] });
      }

      // Mutation
      for (let i = 0; i < childGenes.length; i++) {
        if (Math.random() < mutationRate) {
          const unit = lessonUnits[i];
          const mutType = Math.random();
          if (mutType < 0.6) {
            // Slot & day mutation
            const newDay = randomChoice(workingDays);
            let newSlots;
            if (unit.duration === 2) {
              const pair =
                consecutivePairs.length > 0
                  ? randomChoice(consecutivePairs)
                  : [timeSlots[0], timeSlots[1] || timeSlots[0]];
              newSlots = pair.map((s) => s.id);
            } else {
              newSlots = [randomChoice(timeSlots).id];
            }
            childGenes[i].day = newDay;
            childGenes[i].slotIds = newSlots;
          } else if (mutType < 0.8) {
            // Teacher mutation
            const eligible = teachersBySubject.get(unit.subject_id) || teachers;
            childGenes[i].teacher_id = randomChoice(eligible).id;
          } else {
            // Room mutation
            if (unit.is_lab) {
              childGenes[i].classroom_id =
                labRooms.length > 0 ? randomChoice(labRooms).id : randomChoice(fallbackRooms).id;
            } else {
              childGenes[i].classroom_id =
                theoryRooms.length > 0 ? randomChoice(theoryRooms).id : randomChoice(fallbackRooms).id;
            }
          }
        }
      }

      const childScore = evaluateFitness(childGenes);
      nextGen.push({ genes: childGenes, ...childScore });
    }

    nextGen.sort((a, b) => b.fitness - a.fitness);
    population = nextGen;

    if (population[0].fitness > bestSolution.fitness) {
      bestSolution = population[0];
    }
  }

  // Local repair operator to resolve any remaining hard violations
  function repairChromosome(genes) {
    let currentScore = evaluateFitness(genes);
    if (currentScore.hardViolations === 0) return genes;

    const repaired = genes.map((g) => ({ ...g, slotIds: [...g.slotIds] }));

    for (let i = 0; i < lessonUnits.length; i++) {
      if (currentScore.hardViolations === 0) break;
      const unit = lessonUnits[i];
      const gene = repaired[i];

      const candidateSlotPairs =
        unit.duration === 2
          ? consecutivePairs.map((p) => p.map((s) => s.id))
          : timeSlots.map((ts) => [ts.id]);

      let bestGene = { ...gene, slotIds: [...gene.slotIds] };
      let minViolations = currentScore.hardViolations;

      for (const day of workingDays) {
        for (const slotIds of candidateSlotPairs) {
          repaired[i] = { ...gene, day, slotIds };
          const evalRes = evaluateFitness(repaired);
          if (evalRes.hardViolations < minViolations) {
            minViolations = evalRes.hardViolations;
            bestGene = { ...gene, day, slotIds };
            if (minViolations === 0) break;
          }
        }
        if (minViolations === 0) break;
      }

      repaired[i] = bestGene;
      currentScore = evaluateFitness(repaired);
    }

    return repaired;
  }

  // Guarantee 0 hard violations if possible via memetic repair
  if (bestSolution.hardViolations > 0) {
    const repairedGenes = repairChromosome(bestSolution.genes);
    const repairedScore = evaluateFitness(repairedGenes);
    if (repairedScore.hardViolations <= bestSolution.hardViolations) {
      bestSolution = { genes: repairedGenes, ...repairedScore };
    }
  }

  // --- Persist the generated conflict-free timetable to SQLite ---
  const now = new Date().toISOString();
  const timetableId = randomUUID();
  const shareToken = randomUUID().replace(/-/g, "").substring(0, 16);

  const finalName = name || `Timetable ${new Date().toLocaleDateString()}`;

  db.prepare(
    `INSERT INTO timetables (id, name, academic_year, year_id, timing_id, is_active, is_locked, share_token, generated_at, modified_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?)`
  ).run(timetableId, finalName, academicYear || new Date().getFullYear().toString(), yearId || null, activeTimingId, shareToken, now, now, now, now);

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
      });
    }
  }

  const insertLesson = db.prepare(
    `INSERT INTO lessons (id, timetable_id, day, time_slot_id, class_id, subject_id, teacher_id, classroom_id, created_at, updated_at)
     VALUES (@id, @timetable_id, @day, @time_slot_id, @class_id, @subject_id, @teacher_id, @classroom_id, @created_at, @updated_at)`
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
  };
}

module.exports = { generateTimetable };
