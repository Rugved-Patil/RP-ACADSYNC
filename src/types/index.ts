// Year represents an academic year level
export interface Year {
  id: string;
  name: string; // e.g., "First Year", "Second Year"
  created_at?: string;
  updated_at?: string;
}

// Class represents a group of students
export interface Class {
  id: string;
  name: string; // e.g., "CS-A", "IT-B"
  year_id?: string; // reference to year
  student_count?: number; // number of students in the class
  created_at?: string;
  updated_at?: string;
}

// Teacher represents a faculty member
export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
  subjects?: string[]; // subject IDs they're assigned to teach - derived
  created_at?: string;
  updated_at?: string;
}

// Subject represents a course
export interface Subject {
  id: string;
  name: string;
  code: string; // e.g., "CS101"
  classes?: string[]; // Array of class IDs this subject is assigned to - derived
  periodsPerWeek?: number; // Number of periods per week for this subject
  periods_per_week?: number;
  isLab?: boolean; // Indicates if this subject requires a lab
  is_lab?: boolean;
  lab_duration_hours?: number; // Lab duration in hours (1 or 2)
  created_at?: string;
  updated_at?: string;
}

// TimeSlot represents a period in the day
export interface TimeSlot {
  id: string;
  timing_id: string;
  start_time: string; // e.g., "09:00"
  end_time: string; // e.g., "10:00"
  is_break: boolean; // true if this is a recess/lunch period
  slot_order: number;
  startTime?: string; // computed field for compatibility
  endTime?: string; // computed field for compatibility
  isBreak?: boolean; // computed field for compatibility
  name?: string; // computed field for compatibility
  created_at?: string;
  updated_at?: string;
}

// Timing represents time schedule configuration
export interface Timing {
  id: string;
  name: string;
  periods: any; // JSON periods data
  working_days: number[];
  created_at?: string;
  updated_at?: string;
}

// Classroom represents a physical room where lessons can be held
export interface Classroom {
  id: string;
  name: string;
  capacity: number; // number of students the room can accommodate
  is_lab: boolean; // true if this room is a laboratory
  isLab?: boolean; // computed field for compatibility
  location?: string;
  equipment?: string;
  created_at?: string;
  updated_at?: string;
}

// Lesson represents a single class in the timetable
export interface Lesson {
  id: string;
  timetable_id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  classroom_id?: string;
  time_slot_id: string;
  day: number; // 0 for Monday, 1 for Tuesday, etc.
  batch?: string;

  // Computed/compatibility fields
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  classroomId?: string;
  timeSlotId?: string;

  created_at?: string;
  updated_at?: string;
}

// Timetable represents the full schedule
export interface Timetable {
  id: string;
  name: string;
  timing_id: string;
  lessons: Lesson[];
  academicYear?: string; // computed field
  academic_year?: string;
  share_token?: string;
  created_at?: string;
  updated_at?: string;
}

// Assignment tables
export interface SubjectClassAssignment {
  id: string;
  subject_id: string;
  class_id: string;
  created_at?: string;
}

export interface TeacherSubjectAssignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  created_at?: string;
}

export interface ClassClassroomAssignment {
  id: string;
  class_id: string;
  classroom_id: string;
  created_at?: string;
  updated_at?: string;
}

// Form values interfaces
export interface SubjectFormValues {
  name: string;
  code: string;
  classes?: string[];
  periodsPerWeek?: number;
}

// TimetableView is used to display different views of a timetable
export type TimetableView = "master" | "teacher" | "class" | "classroom";

// Share method types
export type ShareMethod = "whatsapp" | "email" | "download";

// EditMode for timetable
export type EditMode = "none" | "edit";

// Timetable draft interface
export interface TimetableDraft {
  id: string;
  name: string;
  academic_year?: string;
  timing_id: string;
  year_id?: string;
  draft_data: any; // JSON data containing the timetable structure
  created_at?: string;
  updated_at?: string;
}
