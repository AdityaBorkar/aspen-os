// Deprecated surface (HEALTHCARE-SPEC D7): roster, attendance, leave,
// payroll, and role management moved to hr-core / hr-attendance / hr-leave.
// This file stays so the pushed tables keep their history until the later
// drop; no new healthcare workflow may import these schemas. The operations
// explorer-grant table lives here but is owned by operations, not HR.
import { LeaveStatusSchema } from "#/schemas/enums";
import { BranchIdSchema, DateStringSchema, PaginationSchema } from "#/schemas/utils";

import { array, minLength, object, optional, picklist, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

const Id = pipe(string(), minLength(1, "ID is required"));

const UpsertStaffSchema = object({
  branchId: BranchIdSchema,
  department: optional(string()),
  doj: optional(DateStringSchema),
  exitDate: optional(DateStringSchema),
  name: pipe(string(), minLength(1, "Name is required")),
  phone: optional(string()),
  role: pipe(string(), minLength(1, "Role is required")),
  staffId: optional(string()),
  status: optional(picklist(["active", "exited", "on-notice"])),
});

const StaffFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  role: optional(string()),
  status: optional(picklist(["active", "exited", "on-notice"])),
});

const DisableUserSchema = object({
  branchId: BranchIdSchema,
  reason: pipe(string(), minLength(1, "Reason is required")),
  staffId: Id,
  status: picklist(["exited", "on-notice"]),
});

const CreateRoleSchema = object({
  branchId: BranchIdSchema,
  name: pipe(string(), minLength(1, "Role name is required")),
  permissions: optional(array(string())),
});

const UpdateRoleSchema = object({
  permissions: optional(array(string())),
  roleId: Id,
});

const RoleFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
});

const RoleIdSchema = object({
  branchId: BranchIdSchema,
  id: Id,
});

const PlanRosterSchema = object({
  branchId: BranchIdSchema,
  entries: array(
    object({
      date: DateStringSchema,
      shift: picklist(["evening", "morning", "night", "off"]),
      staffId: Id,
    }),
  ),
  month: pipe(string(), minLength(1, "Month is required")),
});

const RosterFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  month: optional(string()),
  staffId: optional(string()),
});

const MarkAttendanceSchema = object({
  branchId: BranchIdSchema,
  date: DateStringSchema,
  staffId: Id,
  status: picklist(["absent", "half", "leave", "present"]),
});

const AttendanceFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  date: optional(string()),
  staffId: optional(string()),
});

const RequestLeaveSchema = object({
  branchId: BranchIdSchema,
  from: DateStringSchema,
  reason: pipe(string(), minLength(1, "Reason is required")),
  staffId: Id,
  to: DateStringSchema,
});

const DecideLeaveSchema = object({
  branchId: BranchIdSchema,
  decidedBy: Id,
  decision: picklist(["approve", "reject"]),
  leaveId: Id,
});

const LeaveFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  staffId: optional(string()),
  status: optional(LeaveStatusSchema),
});

const ExportPayrollSchema = object({
  branchId: BranchIdSchema,
  month: pipe(string(), minLength(1, "Month is required")),
});

const StaffIdSchema = object({
  branchId: BranchIdSchema,
  id: Id,
});

type UpsertStaffInput = InferOutput<typeof UpsertStaffSchema>;
type StaffFilters = InferOutput<typeof StaffFiltersSchema>;
type DisableUserInput = InferOutput<typeof DisableUserSchema>;
type CreateRoleInput = InferOutput<typeof CreateRoleSchema>;
type UpdateRoleInput = InferOutput<typeof UpdateRoleSchema>;
type RoleFilters = InferOutput<typeof RoleFiltersSchema>;
type RoleIdInput = InferOutput<typeof RoleIdSchema>;
type PlanRosterInput = InferOutput<typeof PlanRosterSchema>;
type RosterFilters = InferOutput<typeof RosterFiltersSchema>;
type MarkAttendanceInput = InferOutput<typeof MarkAttendanceSchema>;
type AttendanceFilters = InferOutput<typeof AttendanceFiltersSchema>;
type RequestLeaveInput = InferOutput<typeof RequestLeaveSchema>;
type DecideLeaveInput = InferOutput<typeof DecideLeaveSchema>;
type LeaveFilters = InferOutput<typeof LeaveFiltersSchema>;
type ExportPayrollInput = InferOutput<typeof ExportPayrollSchema>;
type StaffIdInput = InferOutput<typeof StaffIdSchema>;

export {
  AttendanceFiltersSchema,
  CreateRoleSchema,
  DecideLeaveSchema,
  DisableUserSchema,
  ExportPayrollSchema,
  LeaveFiltersSchema,
  MarkAttendanceSchema,
  PlanRosterSchema,
  RequestLeaveSchema,
  RoleFiltersSchema,
  RoleIdSchema,
  RosterFiltersSchema,
  StaffFiltersSchema,
  StaffIdSchema,
  UpdateRoleSchema,
  UpsertStaffSchema,
};

export type {
  AttendanceFilters,
  CreateRoleInput,
  DecideLeaveInput,
  DisableUserInput,
  ExportPayrollInput,
  LeaveFilters,
  MarkAttendanceInput,
  PlanRosterInput,
  RequestLeaveInput,
  RoleFilters,
  RoleIdInput,
  RosterFilters,
  StaffFilters,
  StaffIdInput,
  UpdateRoleInput,
  UpsertStaffInput,
};
