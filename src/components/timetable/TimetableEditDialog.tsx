
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Class, 
  Teacher, 
  Subject, 
  Lesson, 
  TimeSlot, 
  Classroom 
} from "@/types";
import { TimetableService } from "@/services/timetableService";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface TimetableEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson?: Lesson;
  day: number;
  timeSlotId: string;
  classes: Class[];
  teachers: Teacher[];
  subjects: Subject[];
  timeSlots: TimeSlot[];
  onSave: (lesson: Lesson) => void;
  onDelete?: (id: string) => void;
  onAdd: (lesson: Omit<Lesson, "id">) => void;
}

export const TimetableEditDialog: React.FC<TimetableEditDialogProps> = ({
  open,
  onOpenChange,
  lesson,
  day,
  timeSlotId,
  classes,
  teachers,
  subjects,
  timeSlots,
  onSave,
  onDelete,
  onAdd
}) => {
  // State variables
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("no-classroom");
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [eligibleTeachers, setEligibleTeachers] = useState<Teacher[]>([]);
  const [eligibleSubjects, setEligibleSubjects] = useState<Subject[]>([]);
  const [eligibleClassrooms, setEligibleClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"edit" | "add">("edit");

  const { toast } = useToast();

  // Initialize component state
  useEffect(() => {
    if (open) {
      if (lesson) {
        // Edit mode - initialize with lesson data
        setSelectedClassId(lesson.classId);
        setSelectedSubjectId(lesson.subjectId);
        setSelectedTeacherId(lesson.teacherId);
        setSelectedClassroomId(lesson.classroomId || "no-classroom");
        setActiveTab("edit");

        // Load all classrooms
        loadClassrooms();
      } else {
        // Add mode - reset form
        setSelectedClassId("");
        setSelectedSubjectId("");
        setSelectedTeacherId("");
        setSelectedClassroomId("no-classroom");
        setActiveTab("add");
      }
    }
  }, [open, lesson]);

  // Load all classrooms
  const loadClassrooms = async () => {
    try {
      const classroomData = await TimetableService.getClassrooms();
      setClassrooms(classroomData);
    } catch (error) {
      console.error("Error loading classrooms:", error);
      setClassrooms([]);
    }
  };

  // Update eligible teachers when subject changes
  useEffect(() => {
    if (selectedSubjectId) {
      const eligibleTeacherList = teachers.filter((teacher) =>
        teacher.subjects?.includes(selectedSubjectId)
      );
      setEligibleTeachers(eligibleTeacherList);
      
      // Auto-select teacher if there's only one eligible
      if (eligibleTeacherList.length === 1 && !selectedTeacherId) {
        setSelectedTeacherId(eligibleTeacherList[0].id);
      } else if (eligibleTeacherList.length === 0) {
        setSelectedTeacherId("");
      } else if (selectedTeacherId && !eligibleTeacherList.some(t => t.id === selectedTeacherId)) {
        setSelectedTeacherId("");
      }
    } else {
      setEligibleTeachers([]);
      setSelectedTeacherId("");
    }
  }, [selectedSubjectId, teachers, selectedTeacherId]);

  // Update eligible subjects when class changes
  useEffect(() => {
    if (selectedClassId) {
      const eligibleSubjectList = subjects.filter((subject) =>
        subject.classes?.includes(selectedClassId)
      );
      setEligibleSubjects(eligibleSubjectList);
      
      // Reset subject selection if current selection is not eligible
      if (selectedSubjectId && !eligibleSubjectList.some(s => s.id === selectedSubjectId)) {
        setSelectedSubjectId("");
      }
    } else {
      setEligibleSubjects([]);
      setSelectedSubjectId("");
    }
  }, [selectedClassId, subjects, selectedSubjectId]);

  // Update eligible classrooms when subject changes
  useEffect(() => {
    if (selectedSubjectId && classrooms.length > 0) {
      const subject = subjects.find(s => s.id === selectedSubjectId);
      const needsLab = subject?.isLab || false;
      
      const eligibleClassroomList = classrooms.filter(classroom => {
        // If subject needs a lab, only show lab classrooms
        // Otherwise, show all classrooms
        return needsLab ? classroom.isLab : true;
      });
      
      setEligibleClassrooms(eligibleClassroomList);
      
      // Reset classroom selection if current selection is not eligible
      if (selectedClassroomId !== "no-classroom" && 
          !eligibleClassroomList.some(c => c.id === selectedClassroomId)) {
        setSelectedClassroomId("no-classroom");
      }
    } else {
      setEligibleClassrooms(classrooms);
    }
  }, [selectedSubjectId, classrooms, subjects, selectedClassroomId]);

  // Handle saving the lesson
  const handleSave = async () => {
    if (!selectedClassId || !selectedSubjectId || !selectedTeacherId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (class, subject, and teacher).",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (lesson) {
        // Update existing lesson
        const updatedLesson: Lesson = {
          ...lesson,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          teacherId: selectedTeacherId,
          classroomId: selectedClassroomId === "no-classroom" ? undefined : selectedClassroomId,
        };
        
        onSave(updatedLesson);
      } else {
        // Create new lesson
        const newLesson: Omit<Lesson, "id"> = {
          timetable_id: "default-timetable", // We'll need to get this properly
          class_id: selectedClassId,
          subject_id: selectedSubjectId,
          teacher_id: selectedTeacherId,
          classroom_id: selectedClassroomId === "no-classroom" ? undefined : selectedClassroomId,
          time_slot_id: timeSlotId,
          day,
          // Legacy compatibility fields
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          teacherId: selectedTeacherId,
          classroomId: selectedClassroomId === "no-classroom" ? undefined : selectedClassroomId,
          timeSlotId: timeSlotId,
        };
        
        onAdd(newLesson);
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving lesson:", error);
      toast({
        title: "Error",
        description: "Failed to save the lesson. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle class selection change
  const handleClassChange = (value: string) => {
    setSelectedClassId(value);
    setSelectedSubjectId("");
  };

  // Handle subject selection change
  const handleSubjectChange = (value: string) => {
    setSelectedSubjectId(value);
    setSelectedTeacherId("");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {lesson ? "Edit Lesson" : "Add Lesson"}
            </DialogTitle>
          </DialogHeader>

          {lesson ? (
            // Edit mode for existing lesson
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Select
                  value={selectedClassId}
                  onValueChange={handleClassChange}
                  disabled={isLoading}
                >
                  <SelectTrigger id="class">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select
                  value={selectedSubjectId}
                  onValueChange={handleSubjectChange}
                  disabled={isLoading || !selectedClassId}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleSubjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teacher">Teacher</Label>
                <Select
                  value={selectedTeacherId}
                  onValueChange={setSelectedTeacherId}
                  disabled={isLoading || !selectedSubjectId}
                >
                  <SelectTrigger id="teacher">
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleTeachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="classroom">Classroom (Optional)</Label>
                <Select
                  value={selectedClassroomId}
                  onValueChange={setSelectedClassroomId}
                  disabled={isLoading}
                >
                  <SelectTrigger id="classroom">
                    <SelectValue placeholder="Select classroom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-classroom">No specific classroom</SelectItem>
                    {eligibleClassrooms.map((classroom) => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        {classroom.name} ({classroom.isLab ? 'Lab' : 'Room'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            // Add mode for new lesson
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "edit" | "add")}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="add" className="flex-1">
                  Add Lesson
                </TabsTrigger>
              </TabsList>
              <TabsContent value="add" className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="add-class">Class</Label>
                  <Select
                    value={selectedClassId}
                    onValueChange={handleClassChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="add-class">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-subject">Subject</Label>
                  <Select
                    value={selectedSubjectId}
                    onValueChange={handleSubjectChange}
                    disabled={isLoading || !selectedClassId}
                  >
                    <SelectTrigger id="add-subject">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleSubjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-teacher">Teacher</Label>
                  <Select
                    value={selectedTeacherId}
                    onValueChange={setSelectedTeacherId}
                    disabled={isLoading || !selectedSubjectId}
                  >
                    <SelectTrigger id="add-teacher">
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleTeachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-classroom">Classroom (Optional)</Label>
                  <Select
                    value={selectedClassroomId}
                    onValueChange={setSelectedClassroomId}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="add-classroom">
                      <SelectValue placeholder="Select classroom" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-classroom">No specific classroom</SelectItem>
                      {eligibleClassrooms.map((classroom) => (
                        <SelectItem key={classroom.id} value={classroom.id}>
                          {classroom.name} ({classroom.isLab ? 'Lab' : 'Room'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="flex-col space-y-2 sm:flex-row sm:justify-between sm:space-x-2 sm:space-y-0">
            {lesson && onDelete && (
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isLoading}
              >
                Delete Lesson
              </Button>
            )}
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? "Saving..." : lesson ? "Update" : "Add"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lesson? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (lesson && onDelete) {
                  onDelete(lesson.id);
                }
                setIsDeleteDialogOpen(false);
                onOpenChange(false);
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
