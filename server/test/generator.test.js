const { describe, it } = require("node:test");
const assert = require("node:assert");
const { db, fromRow } = require("../db");
const { generateTimetable, getClassBatches } = require("../lib/generator");

describe("Genetic Algorithm Timetable Generator Tests", () => {
  it("should generate a conflict-free timetable satisfying all hard constraints", () => {
    // Generate timetable using current database configuration (populated by seed)
    const result = generateTimetable({
      name: "Test GA Schedule",
      academicYear: "2026-2027",
      popSize: 40,
      maxGenerations: 60,
    });

    assert.ok(result);
    assert.ok(result.id);
    assert.ok(result.lessonsScheduled > 0, "Should have scheduled lessons");
    assert.strictEqual(
      result.hardViolations,
      0,
      `Hard constraint violations must be 0, got ${result.hardViolations}`
    );
    assert.strictEqual(typeof result.midDayGaps, "number", "Should compute mid-day gap score");

    // Verify persisted rows in SQLite
    const savedTimetable = db.prepare("SELECT * FROM timetables WHERE id = ?").get(result.id);
    assert.ok(savedTimetable);
    assert.strictEqual(savedTimetable.name, "Test GA Schedule");

    const lessons = db
      .prepare("SELECT * FROM lessons WHERE timetable_id = ?")
      .all(result.id)
      .map((l) => fromRow("lessons", l));

    assert.strictEqual(lessons.length, result.lessonsScheduled);

    // Hard Constraint Verification on the database rows:
    const teacherSlots = new Set();
    const roomSlots = new Set();
    const teacherDailyCounts = new Map();
    const classrooms = db.prepare("SELECT * FROM classrooms").all().map((c) => fromRow("classrooms", c));
    const subjects = db.prepare("SELECT * FROM subjects").all().map((s) => fromRow("subjects", s));
    const classes = db.prepare("SELECT * FROM classes").all().map((c) => fromRow("classes", c));
    const teachers = db.prepare("SELECT * FROM teachers").all();
    const timeSlots = db.prepare("SELECT * FROM time_slots").all().map((t) => fromRow("time_slots", t));
    const assignments = db.prepare("SELECT * FROM subject_class_assignments").all();

    const classroomMap = new Map(classrooms.map((c) => [c.id, c]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));
    const slotOrderMap = new Map(timeSlots.map((ts) => [ts.id, ts.slot_order]));

    const classAllSlots = new Set();
    const classBatchSlots = new Set();
    const classDailyLessons = new Map();

    for (const l of lessons) {
      const day = l.day;
      const slot = l.time_slot_id;
      const tId = l.teacher_id;
      const cId = l.class_id;
      const rId = l.classroom_id;
      const batch = l.batch;

      // 1. Teacher double-booking check
      const tKey = `${day}:${slot}:${tId}`;
      assert.ok(!teacherSlots.has(tKey), `Teacher ${tId} double booked on day ${day} slot ${slot}`);
      teacherSlots.add(tKey);

      // 2. Class and batch double-booking check
      if (!batch) {
        const cKey = `${day}:${slot}:${cId}`;
        assert.ok(!classAllSlots.has(cKey), `Class ${cId} double booked for whole class on day ${day} slot ${slot}`);
        assert.ok(!classBatchSlots.has(cKey), `Class ${cId} whole class lecture conflicts with batch on day ${day} slot ${slot}`);
        classAllSlots.add(cKey);
      } else {
        const cKey = `${day}:${slot}:${cId}`;
        assert.ok(!classAllSlots.has(cKey), `Batch ${batch} of class ${cId} conflicts with whole class lecture on day ${day} slot ${slot}`);
        const bKey = `${day}:${slot}:${cId}:${batch}`;
        assert.ok(!classBatchSlots.has(bKey), `Batch ${batch} of class ${cId} double booked on day ${day} slot ${slot}`);
        classBatchSlots.add(bKey);
      }

      // 3. Room double-booking check
      if (rId) {
        const rKey = `${day}:${slot}:${rId}`;
        assert.ok(!roomSlots.has(rKey), `Room ${rId} double booked on day ${day} slot ${slot}`);
        roomSlots.add(rKey);
      }

      // 4. Lab room constraint check
      const subj = subjectMap.get(l.subject_id);
      if (subj && subj.is_lab && rId) {
        const room = classroomMap.get(rId);
        assert.ok(room && room.is_lab, `Lab subject ${subj.name} must be placed in a lab classroom`);
      }

      // 5. Teacher daily count
      const tdKey = `${tId}:${day}`;
      const count = (teacherDailyCounts.get(tdKey) || 0) + 1;
      teacherDailyCounts.set(tdKey, count);
      const maxDaily = teacherMap.get(tId)?.max_periods_per_day || 5;
      assert.ok(
        count <= maxDaily,
        `Teacher ${tId} exceeded max daily limit on day ${day}: ${count} > ${maxDaily}`
      );

      // Collect for back-to-back duplicate check
      const cdKey = `${cId}:${day}`;
      if (!classDailyLessons.has(cdKey)) classDailyLessons.set(cdKey, []);
      classDailyLessons.get(cdKey).push({
        slotOrder: slotOrderMap.get(slot),
        subjectId: l.subject_id,
        isLab: !!subj?.is_lab,
      });
    }

    // 6. Back-to-back same non-lab subject check
    for (const [_, dayLessons] of classDailyLessons.entries()) {
      dayLessons.sort((a, b) => a.slotOrder - b.slotOrder);
      for (let i = 0; i < dayLessons.length - 1; i++) {
        if (!dayLessons[i].isLab && !dayLessons[i + 1].isLab) {
          const sameSubject = dayLessons[i].subjectId === dayLessons[i + 1].subjectId;
          const consecutive = dayLessons[i + 1].slotOrder === dayLessons[i].slotOrder + 1;
          assert.ok(
            !(sameSubject && consecutive),
            "Non-lab subject must not repeat consecutively back-to-back"
          );
        }
      }
    }

    // 7. Exact Credit-to-Hours Verification
    for (const cls of classes) {
      const classSubjects = subjects.filter((subject) =>
        assignments.some((a) => a.class_id === cls.id && a.subject_id === subject.id)
      );
      const batches = getClassBatches(cls);

      for (const subject of classSubjects) {
        if (!subject.is_lab) {
          const expectedHours = subject.credits || subject.periods_per_week || 3;
          const actualHours = lessons.filter(
            (l) => l.class_id === cls.id && l.subject_id === subject.id && !l.batch
          ).length;
          assert.strictEqual(
            actualHours,
            expectedHours,
            `Theory subject ${subject.name} in class ${cls.name} must have ${expectedHours} hours, found ${actualHours}`
          );
        } else {
          // Lab: 1 credit = 2 hours (1 block of 2 slots) for each batch
          const expectedHoursPerBatch = (subject.credits || 1) * 2;
          for (const b of batches) {
            const actualBatchHours = lessons.filter(
              (l) => l.class_id === cls.id && l.subject_id === subject.id && l.batch === b
            ).length;
            assert.strictEqual(
              actualBatchHours,
              expectedHoursPerBatch,
              `Lab subject ${subject.name} batch ${b} in class ${cls.name} must have ${expectedHoursPerBatch} hours, found ${actualBatchHours}`
            );
          }
        }
      }
    }

    // Cleanup test timetable
    db.prepare("DELETE FROM timetables WHERE id = ?").run(result.id);
  });
});
