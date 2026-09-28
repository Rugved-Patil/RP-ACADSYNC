
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimetableView } from "@/components/timetable/TimetableView";
import { 
  Class, 
  Teacher, 
  Subject, 
  TimeSlot, 
  Timetable, 
  TimetableView as TimetableViewType,
  EditMode,
  Lesson,
  Classroom 
} from "@/types";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

import { authService } from "@/services/authService";
import { Badge } from "@/components/ui/badge";
import { User, GraduationCap, Shield } from "lucide-react";

interface TimetableTabsProps {
  timetable: Timetable;
  classes: Class[];
  teachers: Teacher[];
  subjects: Subject[];
  timeSlots: TimeSlot[];
  classrooms: Classroom[];
  activeView: TimetableViewType;
  setActiveView: (view: TimetableViewType) => void;
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  selectedTeacherId: string;
  setSelectedTeacherId: (id: string) => void;
  selectedClassroomId: string;
  setSelectedClassroomId: (id: string) => void;
  editMode: EditMode;
  onUpdateLesson: (lesson: Lesson) => Promise<void>;
  onDeleteLesson: (id: string) => Promise<void>;
  onAddLesson: (lesson: Omit<Lesson, "id">) => Promise<void>;
}

export const TimetableTabs: React.FC<TimetableTabsProps> = ({
  timetable,
  classes,
  teachers,
  subjects,
  timeSlots,
  classrooms,
  activeView,
  setActiveView,
  selectedClassId,
  setSelectedClassId,
  selectedTeacherId,
  setSelectedTeacherId,
  selectedClassroomId,
  setSelectedClassroomId,
  editMode,
  onUpdateLesson,
  onDeleteLesson,
  onAddLesson,
}) => {
  const currentUser = authService.getUser();
  const isAdmin = currentUser?.role === "admin";
  const isTeacher = currentUser?.role === "teacher";
  const isStudent = currentUser?.role === "student";

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);
  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <Tabs defaultValue={activeView} value={activeView} onValueChange={(value) => setActiveView(value as TimetableViewType)}>
      {isAdmin ? (
        <TabsList className="mb-4">
          <TabsTrigger value="master">Master Timetable</TabsTrigger>
          <TabsTrigger value="teacher">Teacher Timetable</TabsTrigger>
          <TabsTrigger value="class">Class Timetable</TabsTrigger>
        </TabsList>
      ) : isTeacher ? (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-200 dark:border-blue-900 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground">
                Personal Faculty Timetable: {selectedTeacher?.name || currentUser?.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedTeacher?.specialization || "Faculty Schedule"} &bull; Max {selectedTeacher?.max_periods_per_day || 4} lessons/day
              </div>
            </div>
          </div>
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 text-xs">
            Faculty View
          </Badge>
        </div>
      ) : isStudent ? (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground">
                Class Schedule: {selectedClass?.name || currentUser?.name}
              </div>
              <div className="text-xs text-muted-foreground">
                Student count: {selectedClass?.student_count || 60} &bull; Semester Timetable
              </div>
            </div>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-xs">
            Class View
          </Badge>
        </div>
      ) : null}

      <div className="mb-4">
        {activeView === "teacher" && (
          <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
            <SelectTrigger className="w-full md:w-72">
              <SelectValue placeholder="Select Teacher" />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {activeView === "class" && (
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-full md:w-72">
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {activeView === "classroom" && (
          <Select value={selectedClassroomId} onValueChange={setSelectedClassroomId}>
            <SelectTrigger className="w-full md:w-72">
              <SelectValue placeholder="Select Classroom" />
            </SelectTrigger>
            <SelectContent>
              {classrooms.map((classroom) => (
                <SelectItem key={classroom.id} value={classroom.id}>
                  {classroom.name} ({classroom.isLab ? 'Lab' : 'Room'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <TabsContent value="master" className="mt-0">
        {timetable && (
          <TimetableView
            timetable={timetable}
            classes={classes}
            teachers={teachers}
            subjects={subjects}
            timeSlots={timeSlots}
            view="master"
            editMode={editMode}
            onUpdateLesson={onUpdateLesson}
            onDeleteLesson={onDeleteLesson}
            onAddLesson={onAddLesson}
          />
        )}
      </TabsContent>
      
      <TabsContent value="teacher" className="mt-0">
        {timetable && selectedTeacherId && (
          <div>
            <h3 className="text-xl font-medium mb-4">
              Timetable for {teachers.find(t => t.id === selectedTeacherId)?.name || "Selected Teacher"}
            </h3>
            <TimetableView
              timetable={timetable}
              classes={classes}
              teachers={teachers}
              subjects={subjects}
              timeSlots={timeSlots}
              view="teacher"
              teacherId={selectedTeacherId}
              editMode={editMode}
              onUpdateLesson={onUpdateLesson}
              onDeleteLesson={onDeleteLesson}
              onAddLesson={onAddLesson}
            />
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="class" className="mt-0">
        {timetable && selectedClassId && (
          <div>
            <h3 className="text-xl font-medium mb-4">
              Timetable for {classes.find(c => c.id === selectedClassId)?.name || "Selected Class"}
            </h3>
            <TimetableView
              timetable={timetable}
              classes={classes}
              teachers={teachers}
              subjects={subjects}
              timeSlots={timeSlots}
              view="class"
              classId={selectedClassId}
              editMode={editMode}
              onUpdateLesson={onUpdateLesson}
              onDeleteLesson={onDeleteLesson}
              onAddLesson={onAddLesson}
            />
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="classroom" className="mt-0">
        {timetable && selectedClassroomId && (
          <div>
            <h3 className="text-xl font-medium mb-4">
              Timetable for {classrooms.find(c => c.id === selectedClassroomId)?.name || "Selected Classroom"}
            </h3>
            <TimetableView
              timetable={timetable}
              classes={classes}
              teachers={teachers}
              subjects={subjects}
              timeSlots={timeSlots}
              view="classroom"
              classroomId={selectedClassroomId}
              editMode={editMode}
              onUpdateLesson={onUpdateLesson}
              onDeleteLesson={onDeleteLesson}
              onAddLesson={onAddLesson}
            />
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};
