import { ResidentStatusSchema } from "#/schemas/enums";
import { BranchIdSchema, DateStringSchema, PaginationSchema } from "#/schemas/utils";

import {
  array,
  maxValue,
  minLength,
  minValue,
  number,
  object,
  optional,
  picklist,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

const Id = pipe(string(), minLength(1, "ID is required"));

const CreateResidentSchema = object({
  address: optional(string()),
  advance: pipe(number(), minValue(0, "Advance cannot be negative")),
  age: pipe(number(), minValue(0), maxValue(130)),
  branchId: BranchIdSchema,
  name: pipe(string(), minLength(1, "Name is required")),
  nokName: pipe(string(), minLength(1, "Next-of-kin name is required")),
  nokPhone: pipe(string(), minLength(1, "Next-of-kin phone is required")),
  phone: pipe(string(), minLength(1, "Phone is required")),
  roomType: optional(string()),
  sex: picklist(["female", "male", "other"]),
});

const UpdateResidentSchema = object({
  address: optional(string()),
  phone: optional(string()),
  residentId: Id,
  roomType: optional(string()),
  status: optional(ResidentStatusSchema),
});

const ResidentFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  status: optional(ResidentStatusSchema),
});

const AllocateBedSchema = object({
  bedId: Id,
  branchId: BranchIdSchema,
  note: optional(string()),
  residentId: Id,
});

const UpdateBedAssignmentSchema = object({
  assignmentId: Id,
  note: optional(string()),
});

const BedAssignmentFiltersSchema = object({
  ...PaginationSchema.entries,
  bedId: optional(string()),
  branchId: BranchIdSchema,
  residentId: optional(string()),
});

const CreateGeriatricScoreSchema = object({
  assessedBy: Id,
  branchId: BranchIdSchema,
  kind: picklist(["ADL", "Braden", "IADL", "MMSE", "MNA", "Morse"]),
  note: optional(string()),
  residentId: Id,
  score: number(),
});

const GeriatricScoreFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  kind: optional(string()),
  residentId: optional(string()),
});

const CreatePolypharmacyReviewSchema = object({
  action: picklist(["continue", "deprescribe", "dose-change", "substitute"]),
  branchId: BranchIdSchema,
  meds: array(
    object({
      dose: string(),
      frequency: string(),
      name: pipe(string(), minLength(1)),
    }),
  ),
  note: optional(string()),
  residentId: Id,
  reviewedBy: Id,
});

const PolypharmacyReviewFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  residentId: optional(string()),
});

const CreateDailyLogSchema = object({
  appetite: optional(string()),
  branchId: BranchIdSchema,
  mood: optional(string()),
  note: pipe(string(), minLength(1, "Note is required")),
  residentId: Id,
});

const UpdateDailyLogSchema = object({
  logId: Id,
  note: optional(pipe(string(), minLength(1))),
  status: optional(picklist(["complete", "open"])),
});

const DailyLogFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  residentId: optional(string()),
});

const CreateRoundSchema = object({
  branchId: BranchIdSchema,
  doneBy: Id,
  findings: pipe(string(), minLength(1, "Findings are required")),
  plan: optional(string()),
  residentId: Id,
});

const RoundFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  residentId: optional(string()),
});

const CreateVisitLogSchema = object({
  branchId: BranchIdSchema,
  purpose: pipe(string(), minLength(1, "Purpose is required")),
  relation: optional(string()),
  residentId: Id,
  visitor: pipe(string(), minLength(1, "Visitor name is required")),
});

const VisitLogFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  residentId: optional(string()),
});

const CreateStayChargeSchema = object({
  amount: pipe(number(), minValue(0)),
  branchId: BranchIdSchema,
  chargeDate: DateStringSchema,
  kind: optional(string(), "stay"),
  residentId: Id,
});

const StayChargeFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  residentId: optional(string()),
});

const CompileStayBillSchema = object({
  branchId: BranchIdSchema,
  residentId: Id,
  uptoDate: optional(string()),
});

const ResidentIdSchema = object({
  branchId: BranchIdSchema,
  id: Id,
});

const ResidentListSchema = object({
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), minValue(1), maxValue(500))),
});

type CreateResidentInput = InferOutput<typeof CreateResidentSchema>;
type UpdateResidentInput = InferOutput<typeof UpdateResidentSchema>;
type ResidentFilters = InferOutput<typeof ResidentFiltersSchema>;
type AllocateBedInput = InferOutput<typeof AllocateBedSchema>;
type UpdateBedAssignmentInput = InferOutput<typeof UpdateBedAssignmentSchema>;
type BedAssignmentFilters = InferOutput<typeof BedAssignmentFiltersSchema>;
type CreateGeriatricScoreInput = InferOutput<typeof CreateGeriatricScoreSchema>;
type GeriatricScoreFilters = InferOutput<typeof GeriatricScoreFiltersSchema>;
type CreatePolypharmacyReviewInput = InferOutput<typeof CreatePolypharmacyReviewSchema>;
type PolypharmacyReviewFilters = InferOutput<typeof PolypharmacyReviewFiltersSchema>;
type CreateDailyLogInput = InferOutput<typeof CreateDailyLogSchema>;
type UpdateDailyLogInput = InferOutput<typeof UpdateDailyLogSchema>;
type DailyLogFilters = InferOutput<typeof DailyLogFiltersSchema>;
type CreateRoundInput = InferOutput<typeof CreateRoundSchema>;
type RoundFilters = InferOutput<typeof RoundFiltersSchema>;
type CreateVisitLogInput = InferOutput<typeof CreateVisitLogSchema>;
type VisitLogFilters = InferOutput<typeof VisitLogFiltersSchema>;
type CreateStayChargeInput = InferOutput<typeof CreateStayChargeSchema>;
type StayChargeFilters = InferOutput<typeof StayChargeFiltersSchema>;
type CompileStayBillInput = InferOutput<typeof CompileStayBillSchema>;
type ResidentIdInput = InferOutput<typeof ResidentIdSchema>;
type ResidentListInput = InferOutput<typeof ResidentListSchema>;

export {
  AllocateBedSchema,
  BedAssignmentFiltersSchema,
  CompileStayBillSchema,
  CreateDailyLogSchema,
  CreateGeriatricScoreSchema,
  CreatePolypharmacyReviewSchema,
  CreateResidentSchema,
  CreateRoundSchema,
  CreateStayChargeSchema,
  CreateVisitLogSchema,
  DailyLogFiltersSchema,
  GeriatricScoreFiltersSchema,
  PolypharmacyReviewFiltersSchema,
  ResidentFiltersSchema,
  ResidentIdSchema,
  ResidentListSchema,
  RoundFiltersSchema,
  StayChargeFiltersSchema,
  UpdateBedAssignmentSchema,
  UpdateDailyLogSchema,
  UpdateResidentSchema,
  VisitLogFiltersSchema,
};

export type {
  AllocateBedInput,
  BedAssignmentFilters,
  CompileStayBillInput,
  CreateDailyLogInput,
  CreateGeriatricScoreInput,
  CreatePolypharmacyReviewInput,
  CreateResidentInput,
  CreateRoundInput,
  CreateStayChargeInput,
  CreateVisitLogInput,
  DailyLogFilters,
  GeriatricScoreFilters,
  PolypharmacyReviewFilters,
  ResidentFilters,
  ResidentIdInput,
  ResidentListInput,
  RoundFilters,
  StayChargeFilters,
  UpdateBedAssignmentInput,
  UpdateDailyLogInput,
  UpdateResidentInput,
  VisitLogFilters,
};
