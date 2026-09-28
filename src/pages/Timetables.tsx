import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { TimetableService } from "@/services/timetableService";
import { Timetable, Class, Teacher, Subject, TimeSlot, TimetableView as TimetableViewType, EditMode, Lesson, Classroom } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { TimetableTabs } from "@/components/timetable/TimetableTabs";
import { TimetableActions } from "@/components/timetable/TimetableActions";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/authService";
import { TeacherChangeRequestDialog } from "@/components/timetable/TeacherChangeRequestDialog";

const Timetables = () => {
  const { toast } = useToast();
  const currentUser = authService.getUser();
  const isAdmin = currentUser?.role === "admin";
  const isTeacher = currentUser?.role === "teacher";
  const isStudent = currentUser?.role === "student";

  const [timetable, setTimetable] = React.useState<Timetable | null>(null);
  const [classes, setClasses] = React.useState<Class[]>([]);
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [timeSlots, setTimeSlots] = React.useState<TimeSlot[]>([]);
  const [classrooms, setClassrooms] = React.useState<Classroom[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeView, setActiveView] = React.useState<TimetableViewType>(
    isTeacher ? "teacher" : isStudent ? "class" : "master"
  );
  const [selectedClassId, setSelectedClassId] = React.useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<string>("");
  const [selectedClassroomId, setSelectedClassroomId] = React.useState<string>("");
  const [editMode, setEditMode] = React.useState<EditMode>("none");
  const [isRequestDialogOpen, setIsRequestDialogOpen] = React.useState(false);

  // Fetch all required data
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      
      const [timetableData, classesData, teachersData, subjectsData, timeSlotsData, classroomsData] = await Promise.all([
        TimetableService.getTimetable(),
        TimetableService.getClasses(),
        TimetableService.getTeachers(),
        TimetableService.getSubjects(),
        TimetableService.getTimeSlots(),
        TimetableService.getClassrooms(),
      ]);
      
      setTimetable(timetableData);
      setClasses(classesData);
      setTeachers(teachersData);
      setSubjects(subjectsData);
      setTimeSlots(timeSlotsData);
      setClassrooms(classroomsData);
      
      // Set default selections based on logged-in role identity
      if (isTeacher && currentUser?.teacher_id) {
        setSelectedTeacherId(currentUser.teacher_id);
      } else if (teachersData.length > 0) {
        setSelectedTeacherId(teachersData[0].id);
      }

      if (isStudent && currentUser?.class_id) {
        setSelectedClassId(currentUser.class_id);
      } else if (classesData.length > 0) {
        setSelectedClassId(classesData[0].id);
      }

      if (classroomsData.length > 0) setSelectedClassroomId(classroomsData[0].id);
      
    } catch (error) {
      console.error("Error fetching timetable data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch timetable data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateTimetable = async () => {
    try {
      setLoading(true);
      const newTimetable = await TimetableService.generateTimetable();
      setTimetable(newTimetable);
      
      // Force refresh all the related data to ensure consistency
      await fetchData();
      
      toast({
        title: "Success",
        description: "Timetable generated successfully",
      });
    } catch (error) {
      console.error("Error generating timetable:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate timetable. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!timetable) {
      toast({
        title: "Error",
        description: "No timetable available to share.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const shareToken = await TimetableService.generateShareToken(timetable.id);
      const shareData = await TimetableService.shareTimetable(shareToken, 'whatsapp');
      
      // Open WhatsApp with the formatted message
      window.open(shareData.shareUrl, '_blank');
      
      toast({
        title: "Success",
        description: "Timetable shared via WhatsApp",
      });
    } catch (error) {
      console.error("Error sharing via WhatsApp:", error);
      toast({
        title: "Error",
        description: "Failed to share timetable via WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShareEmail = async () => {
    if (!timetable) {
      toast({
        title: "Error",
        description: "No timetable available to share.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const shareToken = await TimetableService.generateShareToken(timetable.id);
      const emailData = await TimetableService.shareTimetable(shareToken, 'email');
      
      // Open email client with formatted content
      window.location.href = emailData.mailtoUrl;
      
      toast({
        title: "Success",
        description: "Email client opened with timetable content",
      });
    } catch (error) {
      console.error("Error sharing via email:", error);
      toast({
        title: "Error",
        description: "Failed to share timetable via email.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: string = 'csv', day?: string | number) => {
    if (!timetable) {
      toast({
        title: "Error",
        description: "No timetable available to download.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const blob = await TimetableService.downloadTimetable(timetable.id, format as any, day);
      
      const extensions: { [key: string]: string } = {
        pdf: 'pdf',
        excel: 'xlsx',
        csv: 'csv',
        html: 'html',
        json: 'json'
      };
      
      const extension = extensions[format] || 'csv';
      const daySuffix = day !== undefined ? `_day_${day}` : '';
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timetable-${timetable.name || 'export'}${daySuffix}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: `Timetable downloaded as ${format.toUpperCase()}${day !== undefined ? ` (Day ${day})` : ''}`,
      });
    } catch (error) {
      console.error("Error downloading timetable:", error);
      toast({
        title: "Error",
        description: "Failed to download timetable.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = async () => {
    if (!timetable) return;
    try {
      const newLocked = !(timetable as any).is_locked;
      await TimetableService.updateTimetable({
        ...timetable,
        is_locked: newLocked,
      } as any);
      setTimetable({
        ...timetable,
        is_locked: newLocked,
      } as any);
      if (newLocked) setEditMode("none");
      toast({
        title: newLocked ? "Timetable Locked" : "Timetable Unlocked",
        description: newLocked
          ? "Timetable is finalized and locked against edits."
          : "Timetable unlocked. Editing is now enabled.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle timetable lock status.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateLesson = async (lesson: Lesson) => {
    try {
      await TimetableService.updateLesson(lesson);
      const updatedTimetable = await TimetableService.getTimetable();
      setTimetable(updatedTimetable);
      toast({
        title: "Success",
        description: "Lesson updated successfully",
      });
    } catch (error) {
      console.error("Error updating lesson:", error);
      toast({
        title: "Error",
        description: "Failed to update lesson. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLesson = async (id: string) => {
    try {
      await TimetableService.deleteLesson(id);
      const updatedTimetable = await TimetableService.getTimetable();
      setTimetable(updatedTimetable);
      toast({
        title: "Success",
        description: "Lesson deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast({
        title: "Error",
        description: "Failed to delete lesson. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddLesson = async (lesson: Omit<Lesson, "id">) => {
    try {
      await TimetableService.addLesson(lesson);
      const updatedTimetable = await TimetableService.getTimetable();
      setTimetable(updatedTimetable);
      toast({
        title: "Success",
        description: "Lesson added successfully",
      });
    } catch (error) {
      console.error("Error adding lesson:", error);
      toast({
        title: "Error",
        description: "Failed to add lesson. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleEditMode = () => {
    setEditMode(prev => prev === "none" ? "edit" : "none");
  };

  const handleLoadDraft = (draftData: any) => {
    setTimetable(draftData);
    toast({
      title: "Success",
      description: "Draft loaded successfully",
    });
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      if (!timetable) return;

      // Save the current timetable state to the database
      await TimetableService.updateTimetable(timetable);
      
      toast({
        title: "Success",
        description: "Timetable changes saved successfully",
      });
    } catch (error) {
      console.error("Error saving timetable:", error);
      toast({
        title: "Error",
        description: "Failed to save timetable changes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Check for missing required data
  const missingData = [];
  if (teachers.length === 0) missingData.push("Teachers");
  if (subjects.length === 0) missingData.push("Subjects");
  if (classes.length === 0) missingData.push("Classes");
  if (timeSlots.length === 0) missingData.push("Time Slots");

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Timetables" 
        description={
          isTeacher
            ? "Your assigned academic timetable and schedule change requests."
            : isStudent
            ? "Your class weekly timetable and lesson details."
            : "Generate, inspect, and manage master institutional timetables."
        }
        actions={
          isAdmin && (
            <Button onClick={handleSaveChanges} disabled={!timetable}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          )
        }
      />

      <div className="mb-6">
        <TimetableActions
          onGenerate={handleGenerateTimetable}
          onDownload={handleDownload}
          onShareEmail={handleShareEmail}
          onShareWhatsApp={handleShareWhatsApp}
          editMode={editMode}
          toggleEditMode={toggleEditMode}
          currentTimetableData={timetable}
          onLoadDraft={handleLoadDraft}
          isLocked={!!(timetable as any)?.is_locked}
          onToggleLock={handleToggleLock}
          onRequestChange={() => setIsRequestDialogOpen(true)}
        />
      </div>

      {missingData.length > 0 ? (
        <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Missing Required Data
              </h3>
              <div className="mt-2 text-sm text-orange-700 dark:text-orange-300">
                <p>Before you can generate or view timetables, you need to add the following:</p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {missingData.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <div className="flex space-x-3 text-sm">
                  {missingData.includes("Teachers") && (
                    <a href="/teachers" className="font-medium text-orange-700 dark:text-orange-300 hover:text-orange-600 dark:hover:text-orange-200">
                      Add Teachers →
                    </a>
                  )}
                  {missingData.includes("Subjects") && (
                    <a href="/subjects" className="font-medium text-orange-700 dark:text-orange-300 hover:text-orange-600 dark:hover:text-orange-200">
                      Add Subjects →
                    </a>
                  )}
                  {missingData.includes("Classes") && (
                    <a href="/classes" className="font-medium text-orange-700 dark:text-orange-300 hover:text-orange-600 dark:hover:text-orange-200">
                      Add Classes →
                    </a>
                  )}
                  {missingData.includes("Time Slots") && (
                    <a href="/timings" className="font-medium text-orange-700 dark:text-orange-300 hover:text-orange-600 dark:hover:text-orange-200">
                      Add Timings →
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : !timetable ? (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200 mb-2">
              No Timetable Generated Yet
            </h3>
            <p className="text-blue-700 dark:text-blue-300 mb-4">
              Click "Generate Timetable" to create your first timetable using the configured classes, subjects, and teachers.
            </p>
          </div>
        </div>
      ) : (
        <TimetableTabs
          timetable={timetable}
          classes={classes}
          teachers={teachers}
          subjects={subjects}
          timeSlots={timeSlots}
          classrooms={classrooms}
          activeView={activeView}
          setActiveView={setActiveView}
          selectedClassId={selectedClassId}
          setSelectedClassId={setSelectedClassId}
          selectedTeacherId={selectedTeacherId}
          setSelectedTeacherId={setSelectedTeacherId}
          selectedClassroomId={selectedClassroomId}
          setSelectedClassroomId={setSelectedClassroomId}
          editMode={editMode}
          onUpdateLesson={handleUpdateLesson}
          onDeleteLesson={handleDeleteLesson}
          onAddLesson={handleAddLesson}
        />
      )}

      {timetable && (
        <TeacherChangeRequestDialog
          isOpen={isRequestDialogOpen}
          onClose={() => setIsRequestDialogOpen(false)}
          timetable={timetable}
          classes={classes}
          subjects={subjects}
          classrooms={classrooms}
          timeSlots={timeSlots}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default Timetables;
