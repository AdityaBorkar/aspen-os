import { BranchIdSchema, NameSchema } from "#/schemas/utils";

import { integer, minLength, number, object, optional, picklist, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const FacilityCategorySchema = picklist([
  "consultation",
  "procedure",
  "diagnostics",
  "pharmacy",
  "ward",
  "tele",
  "support",
]);

export type FacilityCategory = InferOutput<typeof FacilityCategorySchema>;

export const FacilityWeekdaySchema = picklist(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);

export type FacilityWeekday = InferOutput<typeof FacilityWeekdaySchema>;

const FacilityId = pipe(string(), minLength(1, "Facility ID is required"));

export const CreateFacilitySchema = object({
  branchId: BranchIdSchema,
  category: FacilityCategorySchema,
  code: optional(string()),
  name: NameSchema,
});

export type CreateFacilityInput = InferOutput<typeof CreateFacilitySchema>;

export const UpdateFacilitySchema = object({
  id: FacilityId,
  patch: object({
    category: optional(FacilityCategorySchema),
    code: optional(string()),
    name: optional(NameSchema),
  }),
});

export type UpdateFacilityInput = InferOutput<typeof UpdateFacilitySchema>;

export const FacilityFiltersSchema = object({
  branchId: BranchIdSchema,
  category: optional(FacilityCategorySchema),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  search: optional(string()),
  status: optional(string()),
});

export type FacilityFiltersInput = InferOutput<typeof FacilityFiltersSchema>;

export const FacilityIdSchema = object({ id: FacilityId });

export type FacilityIdInput = InferOutput<typeof FacilityIdSchema>;

export const SetFacilityScheduleSchema = object({
  branchId: BranchIdSchema,
  close: pipe(string(), minLength(1, "Close time is required")),
  facilityId: FacilityId,
  open: pipe(string(), minLength(1, "Open time is required")),
  weekday: FacilityWeekdaySchema,
});

export type SetFacilityScheduleInput = InferOutput<typeof SetFacilityScheduleSchema>;

export const CreateFacilityBlockSchema = object({
  branchId: BranchIdSchema,
  facilityId: FacilityId,
  from: pipe(string(), minLength(1, "Block start is required")),
  reason: optional(string()),
  to: pipe(string(), minLength(1, "Block end is required")),
});

export type CreateFacilityBlockInput = InferOutput<typeof CreateFacilityBlockSchema>;

export const FacilityOverlapQuerySchema = object({
  branchId: BranchIdSchema,
  facilityId: FacilityId,
  from: pipe(string(), minLength(1, "Range start is required")),
  to: pipe(string(), minLength(1, "Range end is required")),
});

export type FacilityOverlapQueryInput = InferOutput<typeof FacilityOverlapQuerySchema>;

export const OccupyFacilitySchema = object({
  branchId: BranchIdSchema,
  facilityId: FacilityId,
  note: optional(string()),
});

export type OccupyFacilityInput = InferOutput<typeof OccupyFacilitySchema>;

export const ReleaseFacilitySchema = object({
  branchId: BranchIdSchema,
  facilityId: FacilityId,
  note: optional(string()),
});

export type ReleaseFacilityInput = InferOutput<typeof ReleaseFacilitySchema>;

export const LogSterilizationSchema = object({
  at: pipe(string(), minLength(1, "Log time is required")),
  branchId: BranchIdSchema,
  by: optional(string()),
  facilityId: FacilityId,
  item: pipe(string(), minLength(1, "Item is required")),
  method: pipe(string(), minLength(1, "Method is required")),
});

export type LogSterilizationInput = InferOutput<typeof LogSterilizationSchema>;

export const FacilityStatusQuerySchema = object({ branchId: BranchIdSchema });

export type FacilityStatusQueryInput = InferOutput<typeof FacilityStatusQuerySchema>;
