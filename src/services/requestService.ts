// requestService.ts — Client service for teacher change requests & schedule overrides.

import { authService } from "./authService";

export interface FreeSlot {
  day: number;
  dayName: string;
  timeSlotId: string;
  startTime: string;
  endTime: string;
  slotOrder: number;
  availableRooms: Array<{
    id: string;
    name: string;
    capacity: number;
    isLab: boolean;
  }>;
}

export interface EnrichedChangeRequest {
  id: string;
  timetable_id: string;
  lesson_id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  current_day: number;
  current_day_name: string;
  current_time_slot_id: string;
  current_classroom_id?: string;
  requested_day?: number;
  requested_day_name?: string;
  requested_time_slot_id?: string;
  requested_classroom_id?: string;
  request_type: "time_change" | "room_change" | "reschedule";
  change_scope: "temporary" | "permanent";
  effective_date?: string | null;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  teacher_name?: string;
  class_name?: string;
  subject_name?: string;
  subject_code?: string;
  current_start_time?: string;
  current_end_time?: string;
  requested_start_time?: string;
  requested_end_time?: string;
  current_classroom_name?: string;
  requested_classroom_name?: string;
}

export interface ScheduleOverride {
  id: string;
  timetable_id: string;
  lesson_id: string;
  change_request_id?: string;
  override_type: "temporary" | "permanent";
  effective_date?: string | null;
  day: number;
  time_slot_id: string;
  classroom_id?: string;
  teacher_id?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

class RequestService {
  private getHeaders(): Record<string, string> {
    const token = authService.getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async calculateFreeSlots(params: {
    timetableId: string;
    classId: string;
    teacherId?: string;
    classroomId?: string;
    excludeLessonId?: string;
  }): Promise<{ freeSlots: FreeSlot[]; totalAvailable: number }> {
    const res = await fetch("/api/functions/calculate-free-slots", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Failed to calculate free slots");
    }

    return res.json();
  }

  async getRequests(params?: {
    timetable_id?: string;
    status?: string;
    teacher_id?: string;
  }): Promise<EnrichedChangeRequest[]> {
    const qs = new URLSearchParams();
    if (params?.timetable_id) qs.set("timetable_id", params.timetable_id);
    if (params?.status) qs.set("status", params.status);
    if (params?.teacher_id) qs.set("teacher_id", params.teacher_id);

    const url = `/api/requests${qs.toString() ? `?${qs.toString()}` : ""}`;
    const res = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Failed to fetch change requests");
    }

    const json = await res.json();
    return json.data || [];
  }

  async createRequest(payload: {
    timetableId: string;
    lessonId: string;
    teacherId?: string;
    classId: string;
    subjectId: string;
    currentDay: number;
    currentTimeSlotId: string;
    currentClassroomId?: string;
    requestedDay?: number;
    requestedTimeSlotId?: string;
    requestedClassroomId?: string;
    requestType?: "time_change" | "room_change" | "reschedule";
    changeScope?: "temporary" | "permanent";
    effectiveDate?: string | null;
    reason?: string;
  }): Promise<any> {
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Failed to submit change request");
    }

    return res.json();
  }

  async reviewRequest(
    requestId: string,
    action: "approve" | "reject",
    adminNotes?: string
  ): Promise<{ request: any; override?: any }> {
    const res = await fetch(`/api/requests/${requestId}/review`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ action, adminNotes }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Failed to ${action} request`);
    }

    return res.json();
  }

  async promoteOverride(overrideId: string): Promise<ScheduleOverride> {
    const res = await fetch(`/api/overrides/${overrideId}/promote`, {
      method: "POST",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Failed to promote schedule override");
    }

    const json = await res.json();
    return json.override;
  }

  async getOverrides(timetableId?: string): Promise<ScheduleOverride[]> {
    const qs = timetableId ? `?timetable_id=${encodeURIComponent(timetableId)}` : "";
    const res = await fetch(`/api/table/schedule_overrides${qs}`, {
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Failed to fetch schedule overrides");
    }

    return res.json();
  }
}

export const requestService = new RequestService();
