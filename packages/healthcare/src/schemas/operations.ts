import { BranchIdSchema, PaginationSchema } from "#/schemas/utils";

import { minLength, number, object, optional, picklist, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

const Id = pipe(string(), minLength(1, "ID is required"));

const UpsertMasterSchema = object({
  branchId: BranchIdSchema,
  domain: pipe(string(), minLength(1, "Master domain is required")),
  key: pipe(string(), minLength(1, "Key is required")),
  value: string(),
});

const MasterFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  domain: optional(string()),
});

const SeedPresetsSchema = object({
  branchId: BranchIdSchema,
  preset: picklist([
    "masters",
    "pricelist",
    "tests",
    "facilities",
    "facility-mri",
    "facility-ct",
    "facility-xray",
    "facility-usg",
    "facility-therapy",
  ]),
});

const DefineReportSchema = object({
  branchId: BranchIdSchema,
  collection: pipe(string(), minLength(1, "Collection is required")),
  filters: optional(string()),
  name: pipe(string(), minLength(1, "Report name is required")),
});

const UpdateReportSchema = object({
  reportId: Id,
  status: optional(picklist(["draft", "published"])),
});

const ReportFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  collection: optional(string()),
});

const RunReportSchema = object({
  branchId: BranchIdSchema,
  limit: optional(number()),
  reportId: Id,
});

const RecordComplianceEvidenceSchema = object({
  attestedBy: optional(string()),
  branchId: BranchIdSchema,
  control: pipe(string(), minLength(1, "Control reference is required")),
  evidencePath: pipe(string(), minLength(1, "Evidence path is required")),
  framework: picklist(["CEA", "NABH", "NABL"]),
});

const ComplianceFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  framework: optional(picklist(["CEA", "NABH", "NABL"])),
});

const GrantExplorerSchema = object({
  branchId: BranchIdSchema,
  expiresAt: optional(string()),
  granteeId: Id,
  scope: pipe(string(), minLength(1, "Scope is required")),
});

const QueryExplorerSchema = object({
  branchId: BranchIdSchema,
  collection: pipe(string(), minLength(1, "Collection is required")),
  filters: optional(string()),
  limit: optional(number()),
  offset: optional(number()),
  sort: optional(string()),
});

const ExplorerGrantFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  granteeId: optional(string()),
});

const QueryAuditSchema = object({
  branchId: BranchIdSchema,
  limit: optional(number()),
});

const OperationsIdSchema = object({
  branchId: BranchIdSchema,
  id: Id,
});

type UpsertMasterInput = InferOutput<typeof UpsertMasterSchema>;
type MasterFilters = InferOutput<typeof MasterFiltersSchema>;
type SeedPresetsInput = InferOutput<typeof SeedPresetsSchema>;
type DefineReportInput = InferOutput<typeof DefineReportSchema>;
type UpdateReportInput = InferOutput<typeof UpdateReportSchema>;
type ReportFilters = InferOutput<typeof ReportFiltersSchema>;
type RunReportInput = InferOutput<typeof RunReportSchema>;
type RecordComplianceEvidenceInput = InferOutput<typeof RecordComplianceEvidenceSchema>;
type ComplianceFilters = InferOutput<typeof ComplianceFiltersSchema>;
type GrantExplorerInput = InferOutput<typeof GrantExplorerSchema>;
type QueryExplorerInput = InferOutput<typeof QueryExplorerSchema>;
type ExplorerGrantFilters = InferOutput<typeof ExplorerGrantFiltersSchema>;
type QueryAuditInput = InferOutput<typeof QueryAuditSchema>;
type OperationsIdInput = InferOutput<typeof OperationsIdSchema>;

export {
  ComplianceFiltersSchema,
  DefineReportSchema,
  ExplorerGrantFiltersSchema,
  GrantExplorerSchema,
  MasterFiltersSchema,
  OperationsIdSchema,
  QueryAuditSchema,
  QueryExplorerSchema,
  RecordComplianceEvidenceSchema,
  ReportFiltersSchema,
  RunReportSchema,
  SeedPresetsSchema,
  UpdateReportSchema,
  UpsertMasterSchema,
};

export type {
  ComplianceFilters,
  DefineReportInput,
  ExplorerGrantFilters,
  GrantExplorerInput,
  MasterFilters,
  OperationsIdInput,
  QueryAuditInput,
  QueryExplorerInput,
  RecordComplianceEvidenceInput,
  ReportFilters,
  RunReportInput,
  SeedPresetsInput,
  UpdateReportInput,
  UpsertMasterInput,
};
