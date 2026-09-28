import React, { useMemo, useState } from "react";
import { Class, Teacher, Subject, TimeSlot, Lesson, Timetable, EditMode, Classroom } from "@/types";
import { cn } from "@/lib/utils";
import { TimetableEditDialog } from "./TimetableEditDialog";
import { ClassColorLegend, getClassColorMap } from "./ClassColorLegend";
import { Edit, Plus, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimetableViewProps {
  timetable: Timetable;
  classes?: Class[];
  teachers?: Teacher[];
  subjects?: Subject[];
  timeSlots?: TimeSlot[];
  classrooms?: Classroom[];
  view: "master" | "teacher" | "class" | "classroom";
  teacherId?: string;
  classId?: string;
  classroomId?: string;
  editMode?: EditMode;
  onUpdateLesson?: (lesson: Lesson) => Promise<void>;
  onDeleteLesson?: (id: string) => Promise<void>;
  onAddLesson?: (lesson: Omit<Lesson, "id">) => Promise<void>;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(timeStr: string) {
  if (!timeStr || typeof timeStr !== "string") return "";
  return timeStr.slice(0, 5);
}

export const TimetableView: React.FC<TimetableViewProps> = ({
  timetable,
  classes = [],
  teachers = [],
  subjects = [],
  timeSlots = [],
  classrooms = [],
  view,
  teacherId,
  classId,
  classroomId,
  editMode = "none",
  onUpdateLesson,
  onDeleteLesson,
  onAddLesson,
}) => {
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [addingLessonAt, setAddingLessonAt] = useState<{ day: number; timeSlotId: string } | null>(null);

  const isLocked = !!(timetable as any)?.is_locked;
  const effectiveEditMode = isLocked ? "none" : editMode;

  // Inputs presence guard
  const inputsReady =
    Array.isArray(classes) &&
    Array.isArray(subjects) &&
    Array.isArray(teachers) &&
    Array.isArray(timeSlots) &&
    classes.length > 0 &&
    subjects.length > 0 &&
    teachers.length > 0 &&
    timeSlots.length > 0;

  // Split slots safely
  const teachingTimeSlots = useMemo(
    () => (timeSlots ?? []).filter((s: any) => !s?.isBreak && !s?.is_break),
    [timeSlots]
  );

  const breakTimeSlots = useMemo(
    () => (timeSlots ?? []).filter((s: any) => !!s?.isBreak || !!s?.is_break),
    [timeSlots]
  );

  // Lookup maps
  const classesById = useMemo(() => new Map((classes ?? []).map((c) => [c.id, c])), [classes]);
  const teachersById = useMemo(() => new Map((teachers ?? []).map((t) => [t.id, t])), [teachers]);
  const subjectsById = useMemo(() => new Map((subjects ?? []).map((s) => [s.id, s])), [subjects]);
  const classroomsById = useMemo(() => new Map((classrooms ?? []).map((c) => [c.id, c])), [classrooms]);
  const slotOrderMap = useMemo(
    () => new Map((timeSlots ?? []).map((ts) => [ts.id, (ts as any).slot_order ?? (ts as any).slotOrder ?? 0])),
    [timeSlots]
  );

  // Source lessons directly from timetable.lessons (persisted in SQLite)
  const allLessons = useMemo<Lesson[]>(() => {
    if (!timetable || !Array.isArray(timetable.lessons)) return [];
    return timetable.lessons.map((lesson: any) => ({
      ...lesson,
      id: lesson.id,
      timetable_id: lesson.timetable_id || lesson.timetableId || timetable.id,
      classId: lesson.class_id || lesson.classId,
      class_id: lesson.class_id || lesson.classId,
      subjectId: lesson.subject_id || lesson.subjectId,
      subject_id: lesson.subject_id || lesson.subjectId,
      teacherId: lesson.teacher_id || lesson.teacherId,
      teacher_id: lesson.teacher_id || lesson.teacherId,
      classroomId: lesson.classroom_id || lesson.classroomId,
      classroom_id: lesson.classroom_id || lesson.classroomId,
      timeSlotId: lesson.time_slot_id || lesson.timeSlotId,
      time_slot_id: lesson.time_slot_id || lesson.timeSlotId,
      day: Number(lesson.day),
    }));
  }, [timetable]);

  // Section 6.4: Visual Conflict Detection Engine
  const conflictsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!allLessons || allLessons.length === 0) return map;

    // Count teacher lessons per day
    const teacherDailyCounts = new Map<string, number>();
    for (const l of allLessons) {
      const tId = l.teacherId || l.teacher_id;
      if (tId) {
        const key = `${tId}:${l.day}`;
        teacherDailyCounts.set(key, (teacherDailyCounts.get(key) || 0) + 1);
      }
    }

    for (let i = 0; i < allLessons.length; i++) {
      const l1 = allLessons[i];
      const errors: string[] = [];

      const t1 = l1.teacherId || l1.teacher_id;
      const c1 = l1.classId || l1.class_id;
      const r1 = l1.classroomId || l1.classroom_id;
      const s1 = l1.subjectId || l1.subject_id;
      const slot1 = l1.timeSlotId || l1.time_slot_id;
      const day1 = Number(l1.day);

      const subjObj = s1 ? subjectsById.get(s1) : undefined;
      const roomObj = r1 ? classroomsById.get(r1) : undefined;
      const teacherObj = t1 ? teachersById.get(t1) : undefined;

      // Lab subject in non-lab classroom
      const isLab = !!(subjObj?.is_lab || (subjObj as any)?.isLab);
      if (isLab && roomObj && !(roomObj.is_lab || (roomObj as any)?.isLab)) {
        errors.push(`Lab subject "${subjObj?.name}" is assigned to non-lab classroom "${roomObj.name}".`);
      }

      // Teacher daily lesson limit exceeded
      if (t1) {
        const dailyCount = teacherDailyCounts.get(`${t1}:${day1}`) || 0;
        const maxDaily = (teacherObj as any)?.max_periods_per_day || 4;
        if (dailyCount > maxDaily) {
          errors.push(
            `Teacher "${teacherObj?.name || "Teacher"}" exceeds daily lesson limit (${dailyCount}/${maxDaily} lessons on this day).`
          );
        }
      }

      // Pairwise checks for collisions
      for (let j = 0; j < allLessons.length; j++) {
        if (i === j) continue;
        const l2 = allLessons[j];
        const t2 = l2.teacherId || l2.teacher_id;
        const c2 = l2.classId || l2.class_id;
        const r2 = l2.classroomId || l2.classroom_id;
        const s2 = l2.subjectId || l2.subject_id;
        const slot2 = l2.timeSlotId || l2.time_slot_id;
        const day2 = Number(l2.day);

        // Same slot collisions:
        if (day1 === day2 && slot1 === slot2) {
          // Double-booked teacher
          if (t1 && t2 && t1 === t2) {
            const otherClass = c2 ? classesById.get(c2)?.name : "another class";
            errors.push(`Teacher "${teacherObj?.name || "Teacher"}" is double-booked with ${otherClass} in this slot.`);
          }
          // Double-booked class
          if (c1 && c2 && c1 === c2) {
            errors.push(`Class is double-booked with multiple lessons in the same time slot.`);
          }
          // Double-booked classroom
          if (r1 && r2 && r1 === r2) {
            const otherClass = c2 ? classesById.get(c2)?.name : "another class";
            errors.push(`Classroom "${roomObj?.name || "Room"}" is double-booked with ${otherClass}.`);
          }
        }

        // Back-to-back same non-lab subject for the same class
        if (day1 === day2 && c1 === c2 && s1 === s2 && !isLab) {
          const ord1 = slotOrderMap.get(slot1);
          const ord2 = slotOrderMap.get(slot2);
          if (ord1 !== undefined && ord2 !== undefined && Math.abs(ord1 - ord2) === 1) {
            errors.push(`Back-to-back duplicate lecture of "${subjObj?.name || "Subject"}" on the same day.`);
          }
        }
      }

      if (errors.length > 0) {
        map.set(l1.id, Array.from(new Set(errors)));
      }
    }

    return map;
  }, [allLessons, teachersById, subjectsById, classroomsById, classesById, slotOrderMap]);

  // View filters
  const filteredLessons = useMemo(() => {
    let result = allLessons;

    if (view === "teacher" && teacherId) {
      result = result.filter((l) => (l.teacherId || l.teacher_id) === teacherId);
    } else if (view === "class" && classId) {
      result = result.filter((l) => (l.classId || l.class_id) === classId);
    } else if (view === "classroom" && classroomId) {
      result = result.filter((l) => {
        const lessonClassroomId = String(l.classroomId || l.classroom_id || "");
        return lessonClassroomId === String(classroomId);
      });
    }

    return result;
  }, [allLessons, view, teacherId, classId, classroomId]);

  // Colors
  const classColorMap = useMemo(() => getClassColorMap(classes ?? []), [classes]);
  const getClassColor = (cId: string) => classColorMap[cId]?.colorClass || "bg-muted border-border";

  // Lookups
  const getClassName = (id: string) => classesById.get(id)?.name || "Unknown Class";
  const getTeacherName = (id: string) => teachersById.get(id)?.name || "Unknown Teacher";
  const getSubjectName = (id: string) => subjectsById.get(id)?.name || "Unknown Subject";
  const getClassroomName = (id?: string) => (id ? classroomsById.get(id)?.name || "Unknown Room" : "No Room");
  const isSubjectLab = (id: string) => {
    const s = subjectsById.get(id);
    return !!(s?.is_lab || (s as any)?.isLab);
  };

  // Actions
  const handleEditLesson = (lesson: Lesson) => {
    if (isLocked) return;
    setEditingLesson(lesson);
    setIsDialogOpen(true);
  };

  const handleAddLesson = (day: number, timeSlotId: string) => {
    if (isLocked) return;
    setAddingLessonAt({ day, timeSlotId });
    setEditingLesson(null);
    setIsDialogOpen(true);
  };

  const handleSaveLesson = async (updatedLesson: Lesson) => {
    if (onUpdateLesson) await onUpdateLesson(updatedLesson);
  };

  const handleDeleteLesson = async (lId: string) => {
    if (onDeleteLesson) await onDeleteLesson(lId);
  };

  const handleAddNewLesson = async (newLesson: Omit<Lesson, "id">) => {
    if (onAddLesson) await onAddLesson(newLesson);
  };

  const renderCell = (day: number, timeSlot: TimeSlot) => {
    if (timeSlot?.isBreak || (timeSlot as any)?.is_break) {
      return (
        <div className="h-full min-h-20 flex items-center justify-center bg-muted/50 text-muted-foreground text-xs font-medium">
          Break
        </div>
      );
    }

    const lessonsInThisSlot = (filteredLessons ?? []).filter(
      (lesson) =>
        lesson.day === day &&
        ((lesson.timeSlotId && lesson.timeSlotId === timeSlot?.id) ||
          (lesson.time_slot_id && lesson.time_slot_id === timeSlot?.id))
    );

    return (
      <div className="h-full min-h-20 p-1 overflow-y-auto">
        {lessonsInThisSlot.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
            {effectiveEditMode === "edit" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAddLesson(day, timeSlot?.id as string)}
                className="text-muted-foreground hover:text-foreground text-xs h-7"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            ) : (
              "Free"
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {lessonsInThisSlot.map((lesson) => {
              const conflicts = conflictsMap.get(lesson.id) || [];
              const hasConflict = conflicts.length > 0;

              return (
                <div
                  key={lesson.id}
                  className={cn(
                    "p-1.5 border rounded text-xs relative group transition-all",
                    hasConflict
                      ? "border-red-500 bg-red-50/90 dark:bg-red-950/70 shadow-sm ring-2 ring-red-400/80"
                      : getClassColor(lesson.classId || lesson.class_id)
                  )}
                  title={hasConflict ? `⚠️ SCHEDULING CONFLICT:\n• ${conflicts.join("\n• ")}` : undefined}
                >
                  {hasConflict && (
                    <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-red-700 dark:text-red-300 bg-red-200/80 dark:bg-red-900/60 px-1 py-0.5 rounded">
                      <AlertTriangle className="h-3 w-3 text-red-600 flex-shrink-0" />
                      <span>Conflict ({conflicts.length})</span>
                    </div>
                  )}

                  <div className="font-semibold text-foreground">
                    {getClassName(lesson.classId || lesson.class_id)}
                  </div>
                  <div className="text-foreground/90">
                    {getSubjectName(lesson.subjectId || lesson.subject_id)}
                    {isSubjectLab(lesson.subjectId || lesson.subject_id) && (
                      <span className="ml-1 px-1 py-0.5 bg-orange-100 text-orange-800 text-[10px] font-medium rounded">
                        Lab
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {getTeacherName(lesson.teacherId || lesson.teacher_id)}
                  </div>
                  {(lesson.classroomId || lesson.classroom_id) && (
                    <div className="text-[11px] text-muted-foreground font-medium">
                      {getClassroomName(lesson.classroomId || lesson.classroom_id)}
                    </div>
                  )}

                  {effectiveEditMode === "edit" && !isLocked && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditLesson(lesson)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 h-6 w-6"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
            {effectiveEditMode === "edit" && !isLocked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAddLesson(day, timeSlot?.id as string)}
                className="w-full text-[11px] text-muted-foreground hover:text-foreground h-6"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!inputsReady) {
    return (
      <div className="bg-card rounded-md p-4 text-sm text-muted-foreground">
        Loading timetable inputs (classes, subjects, teachers, time slots)...
      </div>
    );
  }

  const totalConflicts = conflictsMap.size;

  return (
    <>
      {isLocked && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-md p-3 mb-4 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Timetable is Locked:</strong> This finalized timetable is protected against modifications. To edit lessons, click <strong>Unlock Timetable</strong> in the actions panel above.
          </span>
        </div>
      )}

      {totalConflicts > 0 && (
        <div className="bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 rounded-md p-3 mb-4 text-xs text-red-900 dark:text-red-200 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">⚠️ Scheduling Conflicts Detected:</span> {totalConflicts} lesson(s) violate hard constraints (double-booked teacher, class, or classroom; daily limit exceedance; or lab room mismatch). Affected slots are visually highlighted in red below with detailed hover tooltips.
          </div>
        </div>
      )}

      {view === "master" && <ClassColorLegend classes={classes ?? []} />}

      <div className="bg-card rounded-md shadow overflow-auto">
        <div className="min-w-[768px]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 dark:border-gray-700 p-2 bg-muted/60 text-foreground w-32 font-semibold">
                  Time
                </th>
                {(daysOfWeek ?? []).map((day) => (
                  <th
                    key={day}
                    className="border border-gray-300 dark:border-gray-700 p-2 bg-muted/60 text-foreground font-semibold"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(teachingTimeSlots ?? []).map((timeSlot) => {
                const nextBreak = (breakTimeSlots ?? []).find(
                  (b) =>
                    ((b as any)?.startTime && (b as any).startTime === (timeSlot as any)?.endTime) ||
                    ((b as any)?.start_time && (b as any).start_time === (timeSlot as any)?.end_time)
                );
                return (
                  <React.Fragment
                    key={timeSlot?.id ?? `${(timeSlot as any)?.startTime}-${(timeSlot as any)?.endTime}`}
                  >
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-700 p-2 bg-muted/40 text-foreground w-32 text-xs font-medium">
                        {formatTime((timeSlot as any)?.startTime ?? (timeSlot as any)?.start_time)} –{" "}
                        {formatTime((timeSlot as any)?.endTime ?? (timeSlot as any)?.end_time)}
                      </td>
                      {(daysOfWeek ?? []).map((_, dayIndex) => (
                        <td
                          key={`${timeSlot?.id}-${dayIndex}`}
                          className="border border-gray-300 dark:border-gray-700 p-1 align-top"
                        >
                          {renderCell(dayIndex, timeSlot as TimeSlot)}
                        </td>
                      ))}
                    </tr>
                    {nextBreak && (
                      <tr className="bg-muted/40">
                        <td className="border border-gray-300 dark:border-gray-700 p-2 text-xs font-semibold text-foreground whitespace-nowrap">
                          {formatTime((nextBreak as any)?.startTime ?? (nextBreak as any)?.start_time)} –{" "}
                          {formatTime((nextBreak as any)?.endTime ?? (nextBreak as any)?.end_time)}
                        </td>
                        {(daysOfWeek ?? []).map((_, dayIndex) => (
                          <td
                            key={`break-${nextBreak?.id}-${dayIndex}`}
                            className="border border-gray-300 dark:border-gray-700 p-1 align-top"
                          >
                            {renderCell(dayIndex, nextBreak as TimeSlot)}
                          </td>
                        ))}
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(editingLesson !== null || addingLessonAt !== null) && !isLocked && (
        <TimetableEditDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          lesson={editingLesson}
          day={addingLessonAt?.day ?? 0}
          timeSlotId={addingLessonAt?.timeSlotId ?? ""}
          teachers={teachers ?? []}
          subjects={subjects ?? []}
          classes={classes ?? []}
          timeSlots={timeSlots ?? []}
          onSave={handleSaveLesson}
          onDelete={handleDeleteLesson}
          onAdd={handleAddNewLesson}
        />
      )}
    </>
  );
};
