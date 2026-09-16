export const HR_OWNERSHIP_EMPLOYEE = "hr-core.employee" as const;

export const HR_OWNERSHIP_POSITION = "hr-core.position" as const;

export const HR_OWNERSHIP_ACCESS = "hr-core.access" as const;

export const HR_OWNERSHIP_SHIFT = "hr-attendance.shift" as const;

export const HR_OWNERSHIP_ATTENDANCE = "hr-attendance.attendance" as const;

export const HR_OWNERSHIP_LEAVE = "hr-leave.leave" as const;

export interface HealthcareStaffIntent {
  branchId: string;
  healthcareStaffId: string;
  name: string;
  role: string;
}

export interface HealthcareLeaveIntent {
  branchId: string;
  decidedBy?: string | null;
  fromDate: string;
  healthcareLeaveId: string;
  staffId: string;
  status: string;
  toDate: string;
}

export interface HealthcareAttendanceIntent {
  branchId: string;
  date: string;
  healthcareAttendanceId: string;
  staffId: string;
  status: string;
}

export interface HealthcareRosterIntent {
  branchId: string;
  date: string;
  healthcareRosterId: string;
  month: string;
  shift: string;
  staffId: string;
}
