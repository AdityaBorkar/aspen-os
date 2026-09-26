import { OrgBranchTypeSchema } from "#/schemas/enums";
import { GstinSchema, IdSchema, NameSchema, OrgBranchCodeSchema } from "#/schemas/utils";

import { nullable, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

/**
 * Org branch identity only. Postal addresses live in `master_address`
 * (`entityType: "org_branch"`, canonical `AddressSchema` in `@aspen-os/masters`),
 * contacts in `master_contact` (`entityType: "org_branch"`), and free-text notes
 * in `note` (org_branch scope). Do not re-add inline address/contact/note fields here.
 *
 * Billing/location pointers reference an address/contact row anywhere in the
 * tenant; `null` clears the pointer.
 */
export const CreateOrgBranchSchema = object({
  billingAddressId: optional(nullable(IdSchema)),
  billingContactId: optional(nullable(IdSchema)),
  code: OrgBranchCodeSchema,
  gstin: optional(nullable(GstinSchema)),
  locationAddressId: optional(nullable(IdSchema)),
  locationContactId: optional(nullable(IdSchema)),
  metadata: optional(nullable(object({}))),
  name: NameSchema,
  parentOrgBranch: optional(nullable(string())),
  type: OrgBranchTypeSchema,
});

export type CreateOrgBranchInput = InferOutput<typeof CreateOrgBranchSchema>;

export const UpdateOrgBranchSchema = object({
  billingAddressId: optional(nullable(IdSchema)),
  billingContactId: optional(nullable(IdSchema)),
  code: optional(OrgBranchCodeSchema),
  gstin: optional(nullable(GstinSchema)),
  locationAddressId: optional(nullable(IdSchema)),
  locationContactId: optional(nullable(IdSchema)),
  metadata: optional(nullable(object({}))),
  name: optional(NameSchema),
  parentOrgBranch: optional(nullable(string())),
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
