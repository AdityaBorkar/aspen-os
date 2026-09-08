import { BranchTypeSchema } from "#/schemas/enums";
import { BranchCodeSchema, NameSchema } from "#/schemas/utils";

import { date, nullable, number, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

/**
 * Branch identity only. Postal addresses live in `master_address`
 * (`entityType: "branch"`, canonical `AddressSchema` in `@aspen-os/masters`),
 * contacts in `master_contact` (`entityType: "branch"`), and free-text notes
 * in `note` (branch scope). Do not re-add inline address/contact/note fields here.
 */
export const CreateBranchSchema = object({
  capacity: optional(nullable(number())),
  closedDate: optional(date()),
  code: BranchCodeSchema,
  metadata: optional(nullable(object({}))),
  name: NameSchema,
  openedDate: optional(date()),
  parentBranch: optional(nullable(string())),
  timezone: optional(nullable(string())),
  type: BranchTypeSchema,
});

export type CreateBranchInput = InferOutput<typeof CreateBranchSchema>;

export const UpdateBranchSchema = object({
  capacity: optional(nullable(number())),
  closedDate: optional(date()),
  code: optional(BranchCodeSchema),
  metadata: optional(nullable(object({}))),
  name: optional(NameSchema),
  openedDate: optional(date()),
  parentBranch: optional(nullable(string())),
  timezone: optional(nullable(string())),
  type: optional(BranchTypeSchema),
});

export type UpdateBranchInput = InferOutput<typeof UpdateBranchSchema>;

export const BranchFiltersSchema = object({
  parentBranch: optional(string()),
  type: optional(BranchTypeSchema),
});

export type BranchFilters = InferOutput<typeof BranchFiltersSchema>;
