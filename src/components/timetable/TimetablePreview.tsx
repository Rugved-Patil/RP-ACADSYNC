import React from "react";
import { Class, Teacher, Subject, TimeSlot, Timetable } from "@/types";
import { cn } from "@/lib/utils";
import { getClassColorMap } from "./ClassColorLegend";

interface TimetablePreviewProps {
  timetable: Timetable;
  classes: Class[];
  teachers: Teacher[];
  subjects: Subject[];
  timeSlots: TimeSlot[];
  view: "master" | "teacher" | "class" | "classroom";
  teacherId?: string;
  classId?: string;
  classroomId?: string;
}

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const TimetablePreview: React.FC<TimetablePreviewProps> = ({
  timetable,
  classes,
  teachers,
  subjects,
  timeSlots,
  view,
  teacherId,
  classId,
  classroomId,
}) => {
  // Filter lessons based on view type
  const filteredLessons = React.useMemo(() => {
    if (!timetable || !timetable.lessons || timetable.lessons.length === 0) {
      return [];
    }
    
    if (view === "teacher" && teacherId) {
      return timetable.lessons.filter((lesson) => lesson.teacherId === teacherId);
    } else if (view === "class" && classId) {
      return timetable.lessons.filter((lesson) => lesson.classId === classId);
    } else if (view === "classroom" && classroomId) {
      return timetable.lessons.filter((lesson) => lesson.classroomId === classroomId);
    }
    return timetable.lessons;
  }, [timetable, view, teacherId, classId, classroomId]);

  // Filter out break slots and limit to first 4 time slots for compact view
  const compactTimeSlots = timeSlots.filter(slot => !slot.isBreak).slice(0, 4);

  // Helper functions
  const getClassName = (classId: string) => {
    return classes.find((c) => c.id === classId)?.name || "Unknown";
  };

  const getTeacherName = (teacherId: string) => {
    return teachers.find((t) => t.id === teacherId)?.name || "Unknown";
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId)?.name || "Unknown";
  };

  // Get class color mapping
  const classColorMap = React.useMemo(() => getClassColorMap(classes), [classes]);

  const getClassColor = (classId: string) => {
    return classColorMap[classId]?.colorClass || "bg-muted border-border";
  };

  // Find a lesson for a specific day and time slot
  const getLessonFor = (day: number, timeSlotId: string) => {
    return filteredLessons.find(
      (lesson) =>
        lesson.day === day &&
        lesson.timeSlotId === timeSlotId
    );
  };

  // Render cell content
  const renderCell = (day: number, timeSlot: TimeSlot) => {
    if (view === "master") {
      const lessonsInThisSlot = filteredLessons.filter(
        (lesson) => lesson.day === day && lesson.timeSlotId === timeSlot.id
      );

      return (
        <div className="h-12 p-0.5 overflow-hidden">
          {lessonsInThisSlot.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
              -
            </div>
          ) : (
            <div className="space-y-0.5">
              {lessonsInThisSlot.slice(0, 2).map((lesson) => (
                <div
                  key={lesson.id}
                  className={cn(
                    "p-0.5 border rounded text-xs truncate",
                    getClassColor(lesson.classId)
                  )}
                >
                  <div className="font-medium text-xs truncate">
                    {getClassName(lesson.classId)}
                  </div>
                  <div className="text-xs truncate">
                    {getSubjectName(lesson.subjectId)}
                  </div>
                </div>
              ))}
              {lessonsInThisSlot.length > 2 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{lessonsInThisSlot.length - 2}
                </div>
              )}
            </div>
          )}
        </div>
      );
    } else {
      const lesson = getLessonFor(day, timeSlot.id);

      return (
        <div className="h-12">
          {lesson ? (
            <div
              className={cn(
                "h-full p-1 flex flex-col justify-center",
                getClassColor(lesson.classId)
              )}
            >
              <div className="font-medium text-xs truncate">
                {getSubjectName(lesson.subjectId)}
              </div>
              {view !== "class" && (
                <div className="text-xs truncate">{getClassName(lesson.classId)}</div>
              )}
              {view !== "teacher" && (
                <div className="text-xs truncate">{getTeacherName(lesson.teacherId)}</div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
              -
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="bg-card rounded-md border overflow-hidden">
      <div className="text-xs">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-border p-1 bg-muted/50 text-xs w-16">Time</th>
              {daysOfWeek.map((day) => (
                <th key={day} className="border border-border p-1 bg-muted/50 text-xs">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {compactTimeSlots.map((timeSlot) => (
              <tr key={timeSlot.id}>
                <td className="border border-border p-1 bg-muted/50 text-xs font-medium">
                  <div className="text-xs">
                    {timeSlot.startTime}
                  </div>
                  <div className="text-xs">
                    {timeSlot.endTime}
                  </div>
                </td>
                {daysOfWeek.map((_, dayIndex) => (
                  <td key={`${timeSlot.id}-${dayIndex}`} className="border border-border">
                    {renderCell(dayIndex, timeSlot)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {timeSlots.filter(slot => !slot.isBreak).length > 4 && (
        <div className="p-2 text-center text-xs text-muted-foreground bg-muted/50 border-t">
          ... and {timeSlots.filter(slot => !slot.isBreak).length - 4} more time slots
        </div>
      )}
    </div>
  );
};