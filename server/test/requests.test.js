const { describe, it } = require("node:test");
const assert = require("node:assert");
const { randomUUID } = require("crypto");
const { db } = require("../db");
const {
  calculateFreeSlots,
  createChangeRequest,
  reviewChangeRequest,
  promoteOverrideToPermanent,
  listEnrichedRequests,
} = require("../lib/requests");

describe("Teacher Change Requests & Schedule Overrides Tests (v2.0.0)", () => {
  // Retrieve sample seeded data
  const timetable = db.prepare("SELECT * FROM timetables WHERE is_active = 1 LIMIT 1").get()
    || db.prepare("SELECT * FROM timetables LIMIT 1").get();
  const lessons = db.prepare("SELECT * FROM lessons WHERE timetable_id = ?").all(timetable.id);
  const teacher = db.prepare("SELECT * FROM teachers LIMIT 1").get();
  const classroom = db.prepare("SELECT * FROM classrooms LIMIT 1").get();
  const adminUser = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get();

  const sampleLesson = lessons[0];

  it("should calculate genuinely free slots excluding slots where class or teacher are booked", () => {
    assert.ok(timetable, "Seeded timetable must exist");
    assert.ok(sampleLesson, "Seeded lesson must exist");

    const freeSlotsResult = calculateFreeSlots({
      timetableId: timetable.id,
      classId: sampleLesson.class_id,
      teacherId: sampleLesson.teacher_id,
      excludeLessonId: sampleLesson.id,
    });

    assert.ok(Array.isArray(freeSlotsResult.freeSlots));
    assert.ok(freeSlotsResult.freeSlots.length > 0);

    // Verify none of the returned slots have another lesson for this class
    for (const slot of freeSlotsResult.freeSlots) {
      const conflict = db
        .prepare("SELECT id FROM lessons WHERE timetable_id = ? AND day = ? AND time_slot_id = ? AND class_id = ? AND id != ?")
        .get(timetable.id, slot.day, slot.timeSlotId, sampleLesson.class_id, sampleLesson.id);
      assert.strictEqual(conflict, undefined, "Slot should not have class conflict");
    }
  });

  it("should create a teacher change request for an available free slot", () => {
    const freeCheck = calculateFreeSlots({
      timetableId: timetable.id,
      classId: sampleLesson.class_id,
      teacherId: sampleLesson.teacher_id,
      excludeLessonId: sampleLesson.id,
    });

    const targetSlot = freeCheck.freeSlots[0];
    assert.ok(targetSlot, "Target free slot must exist");

    const request = createChangeRequest({
      timetableId: timetable.id,
      lessonId: sampleLesson.id,
      teacherId: sampleLesson.teacher_id,
      classId: sampleLesson.class_id,
      subjectId: sampleLesson.subject_id,
      currentDay: sampleLesson.day,
      currentTimeSlotId: sampleLesson.time_slot_id,
      currentClassroomId: sampleLesson.classroom_id,
      requestedDay: targetSlot.day,
      requestedTimeSlotId: targetSlot.timeSlotId,
      requestedClassroomId: targetSlot.availableRooms[0]?.id || classroom.id,
      requestType: "reschedule",
      changeScope: "temporary",
      effectiveDate: "2026-10-20",
      reason: "Conference attendance make-up session",
    });

    assert.ok(request.id);
    assert.strictEqual(request.status, "pending");
    assert.strictEqual(request.change_scope, "temporary");
    assert.strictEqual(request.effective_date, "2026-10-20");

    // Check in database
    const dbRow = db.prepare("SELECT * FROM change_requests WHERE id = ?").get(request.id);
    assert.ok(dbRow);
    assert.strictEqual(dbRow.status, "pending");
  });

  it("should reject creating a change request when the requested slot is double-booked", () => {
    // Find another lesson that occupies a slot
    const anotherLesson = lessons.find((l) => l.id !== sampleLesson.id && l.class_id === sampleLesson.class_id);
    if (anotherLesson) {
      assert.throws(() => {
        createChangeRequest({
          timetableId: timetable.id,
          lessonId: sampleLesson.id,
          teacherId: sampleLesson.teacher_id,
          classId: sampleLesson.class_id,
          subjectId: sampleLesson.subject_id,
          currentDay: sampleLesson.day,
          currentTimeSlotId: sampleLesson.time_slot_id,
          currentClassroomId: sampleLesson.classroom_id,
          requestedDay: anotherLesson.day,
          requestedTimeSlotId: anotherLesson.time_slot_id,
          requestedClassroomId: anotherLesson.classroom_id,
          requestType: "time_change",
          changeScope: "temporary",
          reason: "Conflict test",
        });
      }, /not free/);
    }
  });

  it("should handle admin rejection of a change request without creating overrides", () => {
    const freeCheck = calculateFreeSlots({
      timetableId: timetable.id,
      classId: sampleLesson.class_id,
      teacherId: sampleLesson.teacher_id,
      excludeLessonId: sampleLesson.id,
    });
    const targetSlot = freeCheck.freeSlots[0];

    const reqToReject = createChangeRequest({
      timetableId: timetable.id,
      lessonId: sampleLesson.id,
      teacherId: sampleLesson.teacher_id,
      classId: sampleLesson.class_id,
      subjectId: sampleLesson.subject_id,
      currentDay: sampleLesson.day,
      currentTimeSlotId: sampleLesson.time_slot_id,
      currentClassroomId: sampleLesson.classroom_id,
      requestedDay: targetSlot.day,
      requestedTimeSlotId: targetSlot.timeSlotId,
      requestedClassroomId: targetSlot.availableRooms[0]?.id || classroom.id,
      requestType: "time_change",
      changeScope: "temporary",
      reason: "To be rejected",
    });

    const result = reviewChangeRequest({
      requestId: reqToReject.id,
      reviewerId: adminUser?.id,
      action: "reject",
      adminNotes: "Class has exam scheduled this week",
    });

    assert.strictEqual(result.request.status, "rejected");
    assert.strictEqual(result.override, null);

    const overrideCount = db
      .prepare("SELECT COUNT(*) AS count FROM schedule_overrides WHERE change_request_id = ?")
      .get(reqToReject.id).count;
    assert.strictEqual(overrideCount, 0);
  });

  it("should handle admin approval of temporary change request and create schedule override", () => {
    const freeCheck = calculateFreeSlots({
      timetableId: timetable.id,
      classId: sampleLesson.class_id,
      teacherId: sampleLesson.teacher_id,
      excludeLessonId: sampleLesson.id,
    });
    const targetSlot = freeCheck.freeSlots[0];

    const reqToApprove = createChangeRequest({
      timetableId: timetable.id,
      lessonId: sampleLesson.id,
      teacherId: sampleLesson.teacher_id,
      classId: sampleLesson.class_id,
      subjectId: sampleLesson.subject_id,
      currentDay: sampleLesson.day,
      currentTimeSlotId: sampleLesson.time_slot_id,
      currentClassroomId: sampleLesson.classroom_id,
      requestedDay: targetSlot.day,
      requestedTimeSlotId: targetSlot.timeSlotId,
      requestedClassroomId: targetSlot.availableRooms[0]?.id || classroom.id,
      requestType: "reschedule",
      changeScope: "temporary",
      effectiveDate: "2026-10-25",
      reason: "Guest lecture slot adjustment",
    });

    const result = reviewChangeRequest({
      requestId: reqToApprove.id,
      reviewerId: adminUser?.id,
      action: "approve",
      adminNotes: "Approved temporary reschedule",
    });

    assert.strictEqual(result.request.status, "approved");
    assert.ok(result.override);
    assert.strictEqual(result.override.override_type, "temporary");
    assert.strictEqual(result.override.effective_date, "2026-10-25");
    assert.strictEqual(result.override.day, targetSlot.day);
    assert.strictEqual(result.override.time_slot_id, targetSlot.timeSlotId);

    // Section 7.5: Base recurring weekly lesson remains untouched for temporary overrides!
    const baseLesson = db.prepare("SELECT * FROM lessons WHERE id = ?").get(sampleLesson.id);
    assert.strictEqual(baseLesson.day, sampleLesson.day);
    assert.strictEqual(baseLesson.time_slot_id, sampleLesson.time_slot_id);
  });

  it("should promote temporary schedule exception into permanent base template change", () => {
    // Find active temporary override
    const tempOverride = db
      .prepare("SELECT * FROM schedule_overrides WHERE override_type = 'temporary' LIMIT 1")
      .get();
    assert.ok(tempOverride, "Temporary override must exist");

    const promoted = promoteOverrideToPermanent(tempOverride.id);
    assert.strictEqual(promoted.override_type, "permanent");
    assert.strictEqual(promoted.effective_date, null);

    // Base lesson should now be updated to the new day and slot
    const baseLesson = db.prepare("SELECT * FROM lessons WHERE id = ?").get(tempOverride.lesson_id);
    assert.strictEqual(baseLesson.day, tempOverride.day);
    assert.strictEqual(baseLesson.time_slot_id, tempOverride.time_slot_id);
  });

  it("should list enriched requests with teacher and subject display details", () => {
    const enriched = listEnrichedRequests({ timetableId: timetable.id });
    assert.ok(Array.isArray(enriched));
    assert.ok(enriched.length > 0);
    assert.ok(enriched[0].teacher_name);
    assert.ok(enriched[0].class_name);
    assert.ok(enriched[0].subject_name);
  });
});
