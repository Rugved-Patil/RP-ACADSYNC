import React from "react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { TimetableService } from "@/services/timetableService";
import { supabase } from "@/lib/api";
import { Subject, Class, Teacher } from "@/types";
import { SubjectFormDialog } from "@/components/subject/SubjectFormDialog";
import { TeacherAssignmentDialog } from "@/components/subject/TeacherAssignmentDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SelectableDataTable } from "@/components/ui/selectable-data-table";

const Subjects = () => {
  const { toast } = useToast();
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = React.useState<Subject[]>([]);
  const [classes, setClasses] = React.useState<Class[]>([]);
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isTeacherDialogOpen, setIsTeacherDialogOpen] = React.useState(false);
  const [currentSubject, setCurrentSubject] = React.useState<Subject | null>(null);
  const [deletedSubjects, setDeletedSubjects] = React.useState<Subject[]>([]);
  const [undoTimeoutId, setUndoTimeoutId] = React.useState<NodeJS.Timeout | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [subjectsData, classesData, teachersData] = await Promise.all([
        TimetableService.getSubjects(),
        TimetableService.getClasses(),
        TimetableService.getTeachers(),
      ]);

      setSubjects(subjectsData);
      setClasses(classesData);
      setTeachers(teachersData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (data: Omit<Subject, "id">) => {
    try {
      if (currentSubject) {
        const { error: subjectError } = await supabase
          .from('subjects')
          .update({
            name: data.name,
            code: data.code,
            periods_per_week: data.periodsPerWeek,
            is_lab: data.isLab,
            lab_duration_hours: data.lab_duration_hours,
          })
          .eq('id', currentSubject.id);

        if (subjectError) throw subjectError;

        await supabase
          .from('subject_class_assignments')
          .delete()
          .eq('subject_id', currentSubject.id);

        if (data.classes && data.classes.length > 0) {
          const assignments = data.classes.map(classId => ({
            subject_id: currentSubject.id,
            class_id: classId
          }));

          const { error: assignmentError } = await supabase
            .from('subject_class_assignments')
            .insert(assignments);

          if (assignmentError) throw assignmentError;
        }

        await fetchData();
        toast({
          title: "Success",
          description: "Subject updated successfully.",
        });
      } else {
        const { data: newSubject, error: subjectError } = await supabase
          .from('subjects')
          .insert({
            name: data.name,
            code: data.code,
            periods_per_week: data.periodsPerWeek,
            is_lab: data.isLab,
            lab_duration_hours: data.lab_duration_hours,
          })
          .select()
          .single();

        if (subjectError) throw subjectError;

        if (data.classes && data.classes.length > 0) {
          const assignments = data.classes.map(classId => ({
            subject_id: newSubject.id,
            class_id: classId
          }));

          const { error: assignmentError } = await supabase
            .from('subject_class_assignments')
            .insert(assignments);

          if (assignmentError) throw assignmentError;
        }

        await fetchData();
        toast({
          title: "Success",
          description: "Subject added successfully.",
        });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving subject:", error);
      toast({
        title: "Error",
        description: "Failed to save subject.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      if (currentSubject) {
        await supabase
          .from('subject_class_assignments')
          .delete()
          .eq('subject_id', currentSubject.id);

        await supabase
          .from('teacher_subject_assignments')
          .delete()
          .eq('subject_id', currentSubject.id);

        const { error } = await supabase
          .from('subjects')
          .delete()
          .eq('id', currentSubject.id);

        if (error) throw error;
        await fetchData();
        toast({
          title: "Success",
          description: "Subject deleted successfully.",
        });
        setIsDeleteDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast({
        title: "Error",
        description: "Failed to delete subject.",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      const subjectsToDelete = [...selectedSubjects];
      const subjectIds = subjectsToDelete.map(s => s.id);

      setSubjects(subjects.filter(s => !subjectIds.includes(s.id)));
      setDeletedSubjects(subjectsToDelete);
      setSelectedSubjects([]);

      if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
      }

      const timeoutId = setTimeout(async () => {
        try {
          for (const subject of subjectsToDelete) {
            await supabase.from('subject_class_assignments').delete().eq('subject_id', subject.id);
            await supabase.from('teacher_subject_assignments').delete().eq('subject_id', subject.id);
          }

          const { error } = await supabase
            .from('subjects')
            .delete()
            .in('id', subjectIds);

          if (error) {
            console.error("Error permanently deleting subjects:", error);
            setSubjects(prev => [...prev, ...subjectsToDelete]);
            toast({
              title: "Error",
              description: "Failed to permanently delete subjects. They have been restored.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error in permanent deletion:", error);
        } finally {
          setDeletedSubjects([]);
          setUndoTimeoutId(null);
        }
      }, 10000);

      setUndoTimeoutId(timeoutId);

      toast({
        title: "Subjects deleted",
        description: `${subjectsToDelete.length} subject${subjectsToDelete.length > 1 ? 's' : ''} deleted successfully.`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndoDelete}
          >
            Undo
          </Button>
        ),
      });

    } catch (error) {
      console.error("Error deleting subjects:", error);
      toast({
        title: "Error",
        description: "Failed to delete subjects.",
        variant: "destructive",
      });
    }
  };

  const handleUndoDelete = async () => {
    try {
      if (deletedSubjects.length === 0) return;

      if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
        setUndoTimeoutId(null);
      }

      setSubjects(prev => [...prev, ...deletedSubjects]);
      setDeletedSubjects([]);

      toast({
        title: "Restored",
        description: "Subjects have been restored successfully.",
      });

    } catch (error) {
      console.error("Error restoring subjects:", error);
      toast({
        title: "Error",
        description: "Failed to restore subjects.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setCurrentSubject(null);
  };

  const handleManageTeachers = (subject: Subject) => {
    setCurrentSubject(subject);
    setIsTeacherDialogOpen(true);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Subjects"
        description="Manage subjects and their assignments to classes and teachers"
        actions={
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Subject
          </Button>
        }
      />

      <SelectableDataTable
        data={subjects}
        columns={[
          { key: "name", title: "Name" },
          { key: "code", title: "Code" },
          {
            key: "periodsPerWeek",
            title: "Periods/Week",
            render: (subject: Subject) => subject.periodsPerWeek || 0
          },
          {
            key: "isLab",
            title: "Type",
            render: (subject: Subject) => subject.isLab ? "Lab" : "Theory"
          },
          {
            key: "actions",
            title: "Actions",
            render: (subject: Subject) => (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  title="Manage teachers for this subject"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManageTeachers(subject);
                  }}
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSubject(subject);
                    setIsDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSubject(subject);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
        selectedItems={selectedSubjects}
        onSelectionChange={setSelectedSubjects}
        onBulkDelete={handleBulkDelete}
        isLoading={loading}
      />

      <SubjectFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        classes={classes}
        currentSubject={currentSubject}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete the subject{" "}
            <span className="font-semibold">{currentSubject?.name}</span>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TeacherAssignmentDialog
        open={isTeacherDialogOpen}
        onOpenChange={setIsTeacherDialogOpen}
        subject={currentSubject}
        teachers={teachers}
        onAssignmentsChange={fetchData}
      />
    </div>
  );
};

export default Subjects;
