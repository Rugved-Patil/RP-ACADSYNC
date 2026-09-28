import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { Teacher, Subject, TeacherSubjectAssignment } from "@/types";
import { supabase } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeacherAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | null;
  teachers: Teacher[];
  onAssignmentsChange: () => void;
}

// Manages which teachers are eligible to teach a subject
// (teacher_subject_assignments). This directly feeds the timetable
// generator: a subject with no assigned teacher here will never get
// scheduled a lesson, so this dialog is required for "Generate Timetable"
// to actually produce anything for the subject.
export const TeacherAssignmentDialog = ({
  open,
  onOpenChange,
  subject,
  teachers,
  onAssignmentsChange,
}: TeacherAssignmentDialogProps) => {
  const { toast } = useToast();
  const [assignments, setAssignments] = React.useState<TeacherSubjectAssignment[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const fetchAssignments = React.useCallback(async () => {
    if (!subject) return;
    try {
      const { data, error } = await supabase
        .from("teacher_subject_assignments")
        .select("*")
        .eq("subject_id", subject.id);
      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error("Error fetching teacher assignments:", error);
    }
  }, [subject]);

  React.useEffect(() => {
    if (open) {
      setSelectedTeacherId("");
      fetchAssignments();
    }
  }, [open, fetchAssignments]);

  const assignedTeacherIds = new Set(assignments.map((a) => a.teacher_id));
  const availableTeachers = teachers.filter((t) => !assignedTeacherIds.has(t.id));

  const handleAdd = async () => {
    if (!subject || !selectedTeacherId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("teacher_subject_assignments").insert({
        subject_id: subject.id,
        teacher_id: selectedTeacherId,
      });
      if (error) throw error;
      setSelectedTeacherId("");
      await fetchAssignments();
      onAssignmentsChange();
      toast({ title: "Success", description: "Teacher assigned to subject." });
    } catch (error) {
      console.error("Error assigning teacher:", error);
      toast({ title: "Error", description: "Failed to assign teacher.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    try {
      const { error } = await supabase.from("teacher_subject_assignments").delete().eq("id", assignmentId);
      if (error) throw error;
      await fetchAssignments();
      onAssignmentsChange();
    } catch (error) {
      console.error("Error removing assignment:", error);
      toast({ title: "Error", description: "Failed to remove assignment.", variant: "destructive" });
    }
  };

  const getTeacherName = (teacherId: string) => teachers.find((t) => t.id === teacherId)?.name || "Unknown";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Teachers for {subject?.name}</DialogTitle>
          <DialogDescription>
            Only teachers assigned here are eligible to be scheduled for this subject when you generate a timetable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a teacher to add" />
              </SelectTrigger>
              <SelectContent>
                {availableTeachers.length === 0 ? (
                  <SelectItem disabled value="none">
                    No more teachers to add
                  </SelectItem>
                ) : (
                  availableTeachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={!selectedTeacherId || loading}>
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No teachers assigned yet.</p>
            ) : (
              assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border p-2">
                  <Badge variant="outline">{getTeacherName(a.teacher_id)}</Badge>
                  <Button variant="outline" size="sm" onClick={() => handleRemove(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
