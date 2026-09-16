import { BranchIdSchema as DefaultBranchIdSchema, NameSchema } from "#/schemas/utils";

import { integer, minLength, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const SaveCompanySchema = object({
  logo: optional(string()),
  name: NameSchema,
  slug: optional(string()),
});

export type SaveCompanyInput = InferOutput<typeof SaveCompanySchema>;

export const CreateBranchSchema = object({
  address: optional(string()),
  name: NameSchema,
  orgBranchCode: optional(string()),
  subdomain: pipe(string(), minLength(1, "Subdomain is required")),
});

export type CreateBranchInput = InferOutput<typeof CreateBranchSchema>;

export const BranchIdSchema = object({
  id: pipe(string(), minLength(1, "Branch ID is required")),
});

export type BranchIdInput = InferOutput<typeof BranchIdSchema>;

export const UpdateBranchSchema = object({
  id: pipe(string(), minLength(1, "Branch ID is required")),
  patch: object({
    address: optional(string()),
    name: optional(NameSchema),
    orgBranchCode: optional(string()),
    status: optional(string()),
  }),
});
export type UpdateBranchInput = InferOutput<typeof UpdateBranchSchema>;

export const BranchFiltersSchema = object({
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  status: optional(string()),
});

export type BranchFiltersInput = InferOutput<typeof BranchFiltersSchema>;

export const SaveMasterVersionSchema = object({
  branchId: DefaultBranchIdSchema,
  domain: pipe(string(), minLength(1, "Domain is required")),
  payload: optional(string()),
  version: pipe(string(), minLength(1, "Version is required")),
});

export type SaveMasterVersionInput = InferOutput<typeof SaveMasterVersionSchema>;

export const MasterVersionFiltersSchema = object({
  branchId: optional(string()),
  domain: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
});

export type MasterVersionFiltersInput = InferOutput<typeof MasterVersionFiltersSchema>;

export const SaveTemplateSchema = object({
  body: pipe(string(), minLength(1, "Template body is required")),
  branchId: optional(string()),
  kind: pipe(string(), minLength(1, "Template kind is required")),
  name: NameSchema,
});

export type SaveTemplateInput = InferOutput<typeof SaveTemplateSchema>;

export const TemplateIdSchema = object({
  id: pipe(string(), minLength(1, "Template ID is required")),
});

export type TemplateIdInput = InferOutput<typeof TemplateIdSchema>;

export const TemplateFiltersSchema = object({
  branchId: optional(string()),
  kind: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
});

export type TemplateFiltersInput = InferOutput<typeof TemplateFiltersSchema>;

export const SaveRecallRuleSchema = object({
  branchId: optional(string()),
  daysAfter: pipe(number(), integer()),
  message: pipe(string(), minLength(1, "Recall message is required")),
  name: NameSchema,
});

export type SaveRecallRuleInput = InferOutput<typeof SaveRecallRuleSchema>;

export const RecallRuleIdSchema = object({
  id: pipe(string(), minLength(1, "Recall rule ID is required")),
});

export type RecallRuleInput = InferOutput<typeof RecallRuleIdSchema>;

export const RecallRuleFiltersSchema = object({
  branchId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
});

export type RecallRuleFiltersInput = InferOutput<typeof RecallRuleFiltersSchema>;

export const AuditLogsQuerySchema = object({
  action: optional(string()),
  branchId: optional(string()),
  entityType: optional(string()),
  limit: optional(pipe(number(), integer()), 100),
  offset: optional(pipe(number(), integer())),
});

export type AuditLogsQueryInput = InferOutput<typeof AuditLogsQuerySchema>;
