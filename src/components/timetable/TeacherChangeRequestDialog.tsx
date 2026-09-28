import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, Building, CheckCircle2, AlertCircle } from "lucide-react";
import { Lesson, Timetable, Class, Subject, Classroom, TimeSlot } from "@/types";
import { requestService, FreeSlot } from "@/services/requestService";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface TeacherChangeRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  timetable: Timetable;
  classes: Class[];
  subjects: Subject[];
  classrooms: Classroom[];
  timeSlots: TimeSlot[];
  onSuccess?: () => void;
  preSelectedLessonId?: string;
}

export const TeacherChangeRequestDialog: React.FC<TeacherChangeRequestDialogProps> = ({
  isOpen,
  onClose,
  timetable,
  classes,
  subjects,
  classrooms,
  timeSlots,
  onSuccess,
  preSelectedLessonId,
}) => {
  const { toast } = useToast();
  const currentUser = authService.getUser();

  const [selectedLessonId, setSelectedLessonId] = useState<string>(preSelectedLessonId || "");
  const [freeSlots, setFreeSlots] = useState<FreeSlot[]>([]);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [changeScope, setChangeScope] = useState<"temporary" | "permanent">("temporary");
  const [effectiveDate, setEffectiveDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter lessons belonging to the logged-in teacher (or all if admin)
  const teacherLessons = (timetable.lessons || []).filter((l: any) => {
    if (currentUser?.role === "teacher" && currentUser.teacher_id) {
      return (l.teacherId || l.teacher_id) === currentUser.teacher_id;
    }
    return true;
  });

  const selectedLesson = teacherLessons.find((l) => l.id === selectedLessonId);

  // Set default effective date to tomorrow YYYY-MM-DD
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setEffectiveDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (preSelectedLessonId) {
      setSelectedLessonId(preSelectedLessonId);
    } else if (teacherLessons.length > 0 && !selectedLessonId) {
      setSelectedLessonId(teacherLessons[0].id);
    }
  }, [preSelectedLessonId, teacherLessons]);

  // When selected lesson changes, fetch genuinely free slots
  useEffect(() => {
    if (!selectedLesson || !timetable.id) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setError(null);
      try {
        const classId = selectedLesson.classId || (selectedLesson as any).class_id;
        const teacherId = selectedLesson.teacherId || (selectedLesson as any).teacher_id;
        const result = await requestService.calculateFreeSlots({
          timetableId: timetable.id,
          classId,
          teacherId,
          excludeLessonId: selectedLesson.id,
        });

        setFreeSlots(result.freeSlots);
        if (result.freeSlots.length > 0) {
          const first = result.freeSlots[0];
          setSelectedSlotKey(`${first.day}:${first.timeSlotId}`);
          if (first.availableRooms.length > 0) {
            setSelectedRoomId(first.availableRooms[0].id);
          }
        } else {
          setSelectedSlotKey("");
          setSelectedRoomId("");
        }
      } catch (err: any) {
        console.error("Error fetching free slots:", err);
        setError(err.message || "Failed to calculate free slots");
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedLessonId, timetable.id]);

  // Active chosen slot details
  const chosenSlot = freeSlots.find((s) => `${s.day}:${s.timeSlotId}` === selectedSlotKey);

  const getClassName = (id?: string) => classes.find((c) => c.id === id)?.name || "Class";
  const getSubjectName = (id?: string) => subjects.find((s) => s.id === id)?.name || "Subject";
  const getRoomName = (id?: string) => classrooms.find((r) => r.id === id)?.name || "TBA";
  const getSlotTime = (id?: string) => {
    const slot = timeSlots.find((s) => s.id === id);
    return slot ? `${slot.start_time} - ${slot.end_time}` : "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLesson || !chosenSlot) {
      setError("Please select a lesson and an available free slot.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await requestService.createRequest({
        timetableId: timetable.id,
        lessonId: selectedLesson.id,
        teacherId: selectedLesson.teacherId || (selectedLesson as any).teacher_id,
        classId: selectedLesson.classId || (selectedLesson as any).class_id,
        subjectId: selectedLesson.subjectId || (selectedLesson as any).subject_id,
        currentDay: selectedLesson.day,
        currentTimeSlotId: selectedLesson.timeSlotId || (selectedLesson as any).time_slot_id,
        currentClassroomId: selectedLesson.classroomId || (selectedLesson as any).classroom_id,
        requestedDay: chosenSlot.day,
        requestedTimeSlotId: chosenSlot.timeSlotId,
        requestedClassroomId: selectedRoomId || undefined,
        requestType: "reschedule",
        changeScope,
        effectiveDate: changeScope === "temporary" ? effectiveDate : null,
        reason,
      });

      toast({
        title: "Request Submitted",
        description: `Schedule change request submitted for administrator review.`,
      });

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary" />
            <span>Request Schedule Change</span>
          </DialogTitle>
          <DialogDescription>
            Submit a time or classroom adjustment to the administrator. Only conflict-free slots are shown.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {/* 1. Select Lesson */}
          <div className="space-y-1.5">
            <Label htmlFor="lesson-select">Select Lesson to Change</Label>
            <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
              <SelectTrigger id="lesson-select">
                <SelectValue placeholder="Choose a lesson..." />
              </SelectTrigger>
              <SelectContent>
                {teacherLessons.map((l) => {
                  const dayName = DAYS[l.day] || `Day ${l.day}`;
                  const sName = getSubjectName(l.subjectId || (l as any).subject_id);
                  const cName = getClassName(l.classId || (l as any).class_id);
                  const time = getSlotTime(l.timeSlotId || (l as any).time_slot_id);
                  return (
                    <SelectItem key={l.id} value={l.id}>
                      {dayName} {time} &bull; {sName} ({cName})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Current Lesson Details Card */}
          {selectedLesson && (
            <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs space-y-1">
              <div className="font-semibold text-foreground">Current Schedule:</div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Subject: </span>
                  {getSubjectName(selectedLesson.subjectId || (selectedLesson as any).subject_id)}
                </div>
                <div>
                  <span className="font-medium text-foreground">Class: </span>
                  {getClassName(selectedLesson.classId || (selectedLesson as any).class_id)}
                </div>
                <div>
                  <span className="font-medium text-foreground">Time: </span>
                  {DAYS[selectedLesson.day]} {getSlotTime(selectedLesson.timeSlotId || (selectedLesson as any).time_slot_id)}
                </div>
                <div>
                  <span className="font-medium text-foreground">Room: </span>
                  {getRoomName(selectedLesson.classroomId || (selectedLesson as any).classroom_id)}
                </div>
              </div>
            </div>
          )}

          {/* 2. Free Slots Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="slot-select">Requested Conflict-Free Slot</Label>
              {loadingSlots && <LoadingSpinner className="h-3.5 w-3.5" />}
            </div>

            {loadingSlots ? (
              <div className="p-3 text-center text-xs text-muted-foreground border rounded-md">
                Verifying institutional constraints & calculating free slots...
              </div>
            ) : freeSlots.length === 0 ? (
              <Alert className="py-2 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                  No conflict-free slots found for this class and teacher combination.
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={selectedSlotKey} onValueChange={setSelectedSlotKey}>
                <SelectTrigger id="slot-select">
                  <SelectValue placeholder="Select target time slot..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {freeSlots.map((s) => (
                    <SelectItem key={`${s.day}:${s.timeSlotId}`} value={`${s.day}:${s.timeSlotId}`}>
                      {s.dayName} &bull; {s.startTime} - {s.endTime} ({s.availableRooms.length} rooms free)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 3. Available Classroom for chosen slot */}
          {chosenSlot && chosenSlot.availableRooms.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="room-select">Requested Classroom</Label>
              <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                <SelectTrigger id="room-select">
                  <SelectValue placeholder="Select classroom..." />
                </SelectTrigger>
                <SelectContent>
                  {chosenSlot.availableRooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} {r.isLab ? "(Laboratory)" : `(Cap: ${r.capacity})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 4. Scope: Temporary vs Permanent (Section 7.5) */}
          <div className="space-y-2 pt-1">
            <Label>Change Scope</Label>
            <RadioGroup
              value={changeScope}
              onValueChange={(val) => setChangeScope(val as "temporary" | "permanent")}
              className="grid grid-cols-2 gap-3"
            >
              <div className="flex items-center space-x-2 border rounded-md p-2.5 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="temporary" id="scope-temp" />
                <Label htmlFor="scope-temp" className="cursor-pointer text-xs">
                  <span className="font-semibold block">Temporary Exception</span>
                  <span className="text-muted-foreground text-[11px]">Specific date only</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-md p-2.5 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="permanent" id="scope-perm" />
                <Label htmlFor="scope-perm" className="cursor-pointer text-xs">
                  <span className="font-semibold block">Permanent Change</span>
                  <span className="text-muted-foreground text-[11px]">Entire semester schedule</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Picker if Temporary */}
          {changeScope === "temporary" && (
            <div className="space-y-1.5">
              <Label htmlFor="effective-date">Effective Date</Label>
              <Input
                id="effective-date"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
              />
            </div>
          )}

          {/* 5. Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason for Adjustment</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Department guest lecture, lab equipment upgrade, or schedule conflict..."
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || freeSlots.length === 0 || !chosenSlot}>
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
