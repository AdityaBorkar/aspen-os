import { OrgBranchTypeSchema } from "#/schemas/enums";
import { NameSchema, OrgBranchCodeSchema } from "#/schemas/utils";

import { date, nullable, number, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

/**
 * Org branch identity only. Postal addresses live in `master_address`
 * (`entityType: "org_branch"`, canonical `AddressSchema` in `@aspen-os/masters`),
 * contacts in `master_contact` (`entityType: "org_branch"`), and free-text notes
 * in `note` (org_branch scope). Do not re-add inline address/contact/note fields here.
 */
export const CreateOrgBranchSchema = object({
  capacity: optional(nullable(number())),
  closedDate: optional(date()),
  code: OrgBranchCodeSchema,
  metadata: optional(nullable(object({}))),
  name: NameSchema,
  openedDate: optional(date()),
  parentOrgBranch: optional(nullable(string())),
  timezone: optional(nullable(string())),
  type: OrgBranchTypeSchema,
});

export type CreateOrgBranchInput = InferOutput<typeof CreateOrgBranchSchema>;

export const UpdateOrgBranchSchema = object({
  capacity: optional(nullable(number())),
  closedDate: optional(date()),
  code: optional(OrgBranchCodeSchema),
  metadata: optional(nullable(object({}))),
  name: optional(NameSchema),
  openedDate: optional(date()),
  parentOrgBranch: optional(nullable(string())),
  timezone: optional(nullable(string())),
  type: optional(OrgBranchTypeSchema),
});

export type UpdateOrgBranchInput = InferOutput<typeof UpdateOrgBranchSchema>;

export const OrgBranchFiltersSchema = object({
  parentOrgBranch: optional(string()),
  type: optional(OrgBranchTypeSchema),
});

export type OrgBranchFilters = InferOutput<typeof OrgBranchFiltersSchema>;

export interface OrgBranchTreeNode {
  children: OrgBranchTreeNode[];
  id: string;
  name: string;
}
