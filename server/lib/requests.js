// requests.js — Teacher change-request engine and schedule overrides for ACADSYNC.
// 1. Free Slot Calculator: identifies genuinely conflict-free slots for class, teacher & room.
// 2. Change Request submission with conflict pre-validation.
// 3. Admin review workflow (approve/reject).
// 4. Temporary vs. Permanent Schedule Overrides layering.
// 5. Promotion of temporary exceptions to permanent base template changes.

const { randomUUID } = require("crypto");
const { db, fromRow } = require("../db");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Calculates genuinely free slots for a class and teacher within a timetable.
 * Section 7.3: "...shown genuinely free slots for that class (not just any slot) —
 * i.e. slots where the class, the teacher, and (for a room change) the classroom are all actually free."
 */
function calculateFreeSlots({
  timetableId,
  classId,
  teacherId,
  classroomId,
  excludeLessonId,
}) {
  if (!timetableId) throw new Error("timetableId is required");

  const timetable = db.prepare("SELECT * FROM timetables WHERE id = ?").get(timetableId);
  if (!timetable) throw new Error("Timetable not found");

  const timingId = timetable.timing_id;
  const timing = db.prepare("SELECT * FROM timings WHERE id = ?").get(timingId);
  const workingDays = timing ? JSON.parse(timing.working_days || "[0,1,2,3,4,5]") : [0, 1, 2, 3, 4, 5];

  // All non-break time slots for this timing configuration
  const slots = db
    .prepare("SELECT * FROM time_slots WHERE timing_id = ? AND is_break = 0 ORDER BY slot_order ASC")
    .all(timingId);

  // All existing lessons in this timetable (excluding the one being moved)
  let lessonsSql = "SELECT * FROM lessons WHERE timetable_id = ?";
  const params = [timetableId];
  if (excludeLessonId) {
    lessonsSql += " AND id != ?";
    params.push(excludeLessonId);
  }
  const lessons = db.prepare(lessonsSql).all(...params);

  // All classrooms for availability lookup
  const allRooms = db.prepare("SELECT * FROM classrooms ORDER BY name ASC").all();

  // Active overrides for this timetable
  const overrides = db
    .prepare("SELECT * FROM schedule_overrides WHERE timetable_id = ? AND is_active = 1")
    .all(timetableId);

  const freeSlots = [];

  for (const day of workingDays) {
    for (const slot of slots) {
      // 1. Is class already booked at this day and slot?
      const classBookedLesson = lessons.find((l) => l.day === day && l.time_slot_id === slot.id && l.class_id === classId);
      const classBookedOverride = overrides.find((o) => o.day === day && o.time_slot_id === slot.id && o.class_id === classId);
      if (classBookedLesson || classBookedOverride) continue;

      // 2. Is teacher already booked at this day and slot?
      if (teacherId) {
        const teacherBookedLesson = lessons.find((l) => l.day === day && l.time_slot_id === slot.id && l.teacher_id === teacherId);
        const teacherBookedOverride = overrides.find((o) => o.day === day && o.time_slot_id === slot.id && o.teacher_id === teacherId);
        if (teacherBookedLesson || teacherBookedOverride) continue;
      }

      // 3. Find which classrooms are available at this day and slot
      const bookedRoomIds = new Set();
      lessons.forEach((l) => {
        if (l.day === day && l.time_slot_id === slot.id && l.classroom_id) {
          bookedRoomIds.add(l.classroom_id);
        }
      });
      overrides.forEach((o) => {
        if (o.day === day && o.time_slot_id === slot.id && o.classroom_id) {
          bookedRoomIds.add(o.classroom_id);
        }
      });

      const availableRooms = allRooms.filter((r) => !bookedRoomIds.has(r.id));

      // If a specific classroom was requested, verify it is available
      if (classroomId && bookedRoomIds.has(classroomId)) {
        continue;
      }

      freeSlots.push({
        day,
        dayName: DAYS[day] || `Day ${day}`,
        timeSlotId: slot.id,
        startTime: slot.start_time,
        endTime: slot.end_time,
        slotOrder: slot.slot_order,
        availableRooms: availableRooms.map((r) => ({
          id: r.id,
          name: r.name,
          capacity: r.capacity,
          isLab: !!r.is_lab,
        })),
      });
    }
  }

  return { freeSlots, totalAvailable: freeSlots.length };
}

/**
 * Creates a teacher change request after validating requirements.
 */
function createChangeRequest({
  timetableId,
  lessonId,
  teacherId,
  classId,
  subjectId,
  currentDay,
  currentTimeSlotId,
  currentClassroomId,
  requestedDay,
  requestedTimeSlotId,
  requestedClassroomId,
  requestType = "time_change",
  changeScope = "temporary",
  effectiveDate = null,
  reason = "",
}) {
  if (!timetableId || !lessonId || !teacherId) {
    throw new Error("timetableId, lessonId, and teacherId are required");
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  // If a time change is requested, verify the requested slot is genuinely free
  if (requestedDay !== undefined && requestedDay !== null && requestedTimeSlotId) {
    const freeCheck = calculateFreeSlots({
      timetableId,
      classId,
      teacherId,
      classroomId: requestedClassroomId || undefined,
      excludeLessonId: lessonId,
    });

    const isMatch = freeCheck.freeSlots.some(
      (s) => s.day === requestedDay && s.timeSlotId === requestedTimeSlotId
    );
    if (!isMatch) {
      throw new Error("Requested time slot is not free for this class, teacher, or classroom.");
    }
  }

  db.prepare(
    `INSERT INTO change_requests (
       id, timetable_id, lesson_id, teacher_id, class_id, subject_id,
       current_day, current_time_slot_id, current_classroom_id,
       requested_day, requested_time_slot_id, requested_classroom_id,
       request_type, change_scope, effective_date, reason,
       status, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(
    id,
    timetableId,
    lessonId,
    teacherId,
    classId,
    subjectId,
    currentDay,
    currentTimeSlotId,
    currentClassroomId || null,
    requestedDay !== undefined ? requestedDay : null,
    requestedTimeSlotId || null,
    requestedClassroomId || null,
    requestType,
    changeScope,
    effectiveDate,
    reason,
    now,
    now
  );

  const row = db.prepare("SELECT * FROM change_requests WHERE id = ?").get(id);
  return fromRow("change_requests", row);
}

/**
 * Reviews a change request (Approve / Reject) by Admin.
 * Section 7.3: Accepting a request creates the schedule override or updates the schedule.
 */
function reviewChangeRequest({ requestId, reviewerId, action, adminNotes = "" }) {
  if (!["approve", "reject"].includes(action)) {
    throw new Error("Action must be 'approve' or 'reject'");
  }

  const request = db.prepare("SELECT * FROM change_requests WHERE id = ?").get(requestId);
  if (!request) throw new Error("Change request not found");
  if (request.status !== "pending") {
    throw new Error(`Change request already ${request.status}`);
  }

  const now = new Date().toISOString();
  let createdOverride = null;

  db.transaction(() => {
    if (action === "reject") {
      db.prepare(
        `UPDATE change_requests
         SET status = 'rejected', admin_notes = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
         WHERE id = ?`
      ).run(adminNotes, reviewerId || null, now, now, requestId);
    } else {
      // Approve
      db.prepare(
        `UPDATE change_requests
         SET status = 'approved', admin_notes = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
         WHERE id = ?`
      ).run(adminNotes, reviewerId || null, now, now, requestId);

      const targetDay = request.requested_day !== null ? request.requested_day : request.current_day;
      const targetSlot = request.requested_time_slot_id || request.current_time_slot_id;
      const targetRoom = request.requested_classroom_id || request.current_classroom_id;

      // Section 7.5: Create schedule_override record
      const overrideId = randomUUID();
      db.prepare(
        `INSERT INTO schedule_overrides (
           id, timetable_id, lesson_id, change_request_id, override_type, effective_date,
           day, time_slot_id, classroom_id, teacher_id, notes, is_active, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      ).run(
        overrideId,
        request.timetable_id,
        request.lesson_id,
        request.id,
        request.change_scope,
        request.change_scope === "temporary" ? request.effective_date : null,
        targetDay,
        targetSlot,
        targetRoom,
        request.teacher_id,
        adminNotes || `Approved ${request.change_scope} change request`,
        now,
        now
      );

      // If scope is permanent, fold directly into the base lessons table!
      if (request.change_scope === "permanent") {
        db.prepare(
          `UPDATE lessons
           SET day = ?, time_slot_id = ?, classroom_id = ?, updated_at = ?
           WHERE id = ?`
        ).run(targetDay, targetSlot, targetRoom, now, request.lesson_id);
      }

      createdOverride = db.prepare("SELECT * FROM schedule_overrides WHERE id = ?").get(overrideId);
    }
  })();

  const updatedRequest = db.prepare("SELECT * FROM change_requests WHERE id = ?").get(requestId);
  return {
    request: fromRow("change_requests", updatedRequest),
    override: createdOverride ? fromRow("schedule_overrides", createdOverride) : null,
  };
}

/**
 * Promotes a temporary schedule exception to permanent (Section 7.5).
 * "The admin can choose to promote an exception into a permanent change,
 * folding it into the base template so it applies every week going forward."
 */
function promoteOverrideToPermanent(overrideId) {
  const override = db.prepare("SELECT * FROM schedule_overrides WHERE id = ?").get(overrideId);
  if (!override) throw new Error("Schedule override not found");

  const now = new Date().toISOString();

  db.transaction(() => {
    // 1. Update override status
    db.prepare(
      `UPDATE schedule_overrides
       SET override_type = 'permanent', effective_date = NULL, updated_at = ?
       WHERE id = ?`
    ).run(now, overrideId);

    // 2. Fold into base lesson
    if (override.lesson_id) {
      db.prepare(
        `UPDATE lessons
         SET day = ?, time_slot_id = ?, classroom_id = ?, updated_at = ?
         WHERE id = ?`
      ).run(override.day, override.time_slot_id, override.classroom_id, now, override.lesson_id);
    }
  })();

  const updated = db.prepare("SELECT * FROM schedule_overrides WHERE id = ?").get(overrideId);
  return fromRow("schedule_overrides", updated);
}

/**
 * Lists change requests with enriched joined metadata.
 */
function listEnrichedRequests({ timetableId, teacherId, status } = {}) {
  let sql = `
    SELECT
      cr.*,
      teachers.name AS teacher_name,
      classes.name AS class_name,
      subjects.name AS subject_name, subjects.code AS subject_code,
      c_slot.start_time AS current_start_time, c_slot.end_time AS current_end_time,
      r_slot.start_time AS requested_start_time, r_slot.end_time AS requested_end_time,
      c_room.name AS current_classroom_name,
      r_room.name AS requested_classroom_name
    FROM change_requests cr
    LEFT JOIN teachers ON teachers.id = cr.teacher_id
    LEFT JOIN classes ON classes.id = cr.class_id
    LEFT JOIN subjects ON subjects.id = cr.subject_id
    LEFT JOIN time_slots c_slot ON c_slot.id = cr.current_time_slot_id
    LEFT JOIN time_slots r_slot ON r_slot.id = cr.requested_time_slot_id
    LEFT JOIN classrooms c_room ON c_room.id = cr.current_classroom_id
    LEFT JOIN classrooms r_room ON r_room.id = cr.requested_classroom_id
    WHERE 1=1
  `;
  const params = [];

  if (timetableId) {
    sql += " AND cr.timetable_id = ?";
    params.push(timetableId);
  }
  if (teacherId) {
    sql += " AND cr.teacher_id = ?";
    params.push(teacherId);
  }
  if (status) {
    sql += " AND cr.status = ?";
    params.push(status);
  }

  sql += " ORDER BY cr.created_at DESC";

  const rows = db.prepare(sql).all(...params);
  return rows.map((r) => ({
    ...fromRow("change_requests", r),
    current_day_name: DAYS[r.current_day] || `Day ${r.current_day}`,
    requested_day_name: r.requested_day !== null ? DAYS[r.requested_day] || `Day ${r.requested_day}` : null,
  }));
}

module.exports = {
  DAYS,
  calculateFreeSlots,
  createChangeRequest,
  reviewChangeRequest,
  promoteOverrideToPermanent,
  listEnrichedRequests,
};
