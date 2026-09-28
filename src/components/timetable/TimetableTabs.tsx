
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
  onAddLesson
}) => {
  return (
    <Tabs defaultValue={activeView} onValueChange={(value) => setActiveView(value as TimetableViewType)}>
      <TabsList className="mb-4">
        <TabsTrigger value="master">Master Timetable</TabsTrigger>
        <TabsTrigger value="teacher">Teacher Timetable</TabsTrigger>
        <TabsTrigger value="class">Class Timetable</TabsTrigger>
        {/* <TabsTrigger value="classroom">Classroom Timetable</TabsTrigger> */}
      </TabsList>

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
