export type {
  AttendanceFilters,
  AttendanceRequestFilters,
  CheckinFilters,
  CreateAttendanceInput,
  CreateAttendanceRequestInput,
  CreateCheckinInput,
  CreateOvertimeSlipInput,
  CreateOvertimeTypeInput,
  CreateShiftAssignmentInput,
  CreateShiftLocationInput,
  CreateShiftRequestInput,
  CreateShiftScheduleAssignmentInput,
  CreateShiftScheduleInput,
  CreateShiftTypeInput,
  OvertimeSlipFilters,
  ShiftAssignmentFilters,
  ShiftRequestFilters,
  UpdateAttendanceInput,
  UpdateAttendanceRequestInput,
  UpdateOvertimeSlipInput,
  UpdateOvertimeTypeInput,
  UpdateShiftAssignmentInput,
  UpdateShiftLocationInput,
  UpdateShiftRequestInput,
  UpdateShiftScheduleAssignmentInput,
  UpdateShiftScheduleInput,
  UpdateShiftTypeInput,
} from "#/schemas";
export {
  AttendanceFiltersSchema,
  AttendanceRequestFiltersSchema,
  CheckinFiltersSchema,
  CreateAttendanceRequestSchema,
  CreateAttendanceSchema,
  CreateCheckinSchema,
  CreateOvertimeSlipSchema,
  CreateOvertimeTypeSchema,
  CreateShiftAssignmentSchema,
  CreateShiftLocationSchema,
  CreateShiftRequestSchema,
  CreateShiftScheduleAssignmentSchema,
  CreateShiftScheduleSchema,
  CreateShiftTypeSchema,
  OvertimeSlipFiltersSchema,
  ShiftAssignmentFiltersSchema,
  ShiftRequestFiltersSchema,
  UpdateAttendanceRequestSchema,
  UpdateAttendanceSchema,
  UpdateOvertimeSlipSchema,
  UpdateOvertimeTypeSchema,
  UpdateShiftAssignmentSchema,
  UpdateShiftLocationSchema,
  UpdateShiftRequestSchema,
  UpdateShiftScheduleAssignmentSchema,
  UpdateShiftScheduleSchema,
  UpdateShiftTypeSchema,
} from "#/schemas";
export interface AttendanceSummary {
  absent: number;
  halfDay: number;
  month: string;
  present: number;
  totalDays: number;
  workFromHome: number;
}

export interface OvertimeSummary {
  holidayHours: number;
  standardHours: number;
  totalHours: number;
  weekendHours: number;
}
