import { minLength, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const ExportPayrollSchema = object({
  branch: optional(string()),
  company: optional(string()),
  department: optional(string()),
  employeeId: optional(pipe(string(), minLength(1, "Employee ID is required"))),
  leavePeriod: optional(string()),
  month: pipe(string(), minLength(1, "Month is required")),
});

export type ExportPayrollInput = InferOutput<typeof ExportPayrollSchema>;
