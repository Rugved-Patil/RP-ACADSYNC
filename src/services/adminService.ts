// adminService.ts — Client service for administration data management APIs

import { authService } from "./authService";

export interface MergeStats {
  addedYears: number;
  addedClasses: number;
  addedClassrooms: number;
  addedTeachers: number;
  addedSubjects: number;
  addedAssignments: number;
  addedUsers: number;
}

export interface MergeResponse {
  success: boolean;
  stats: MergeStats;
  message: string;
}

export interface KillSwitchResponse {
  success: boolean;
  message: string;
}

export const adminService = {
  async mergeSampleData(): Promise<MergeResponse> {
    const token = authService.getToken();
    const res = await fetch("/api/admin/merge-sample-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Merge failed" }));
      throw new Error(err.error || "Failed to merge sample data");
    }
    return res.json();
  },

  async killSwitch(confirmation: string): Promise<KillSwitchResponse> {
    const token = authService.getToken();
    const res = await fetch("/api/admin/kill-switch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ confirmation }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Kill switch failed" }));
      throw new Error(err.error || "Failed to execute kill switch");
    }
    return res.json();
  },
};
