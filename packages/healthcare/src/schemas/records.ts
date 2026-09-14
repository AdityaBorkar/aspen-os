import { BranchIdSchema, PaginationSchema } from "#/schemas/utils";

import { minLength, object, optional, picklist, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

const Id = pipe(string(), minLength(1, "ID is required"));

const AttachDocumentSchema = object({
  branchId: BranchIdSchema,
  encounterId: optional(string()),
  filePath: pipe(string(), minLength(1, "File path is required")),
  fileType: pipe(string(), minLength(1, "File type is required")),
  label: optional(string()),
  patientId: Id,
  uploadedBy: Id,
});

const UpdateDocumentSchema = object({
  docId: Id,
  label: optional(string()),
});

const DocumentFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  encounterId: optional(string()),
  patientId: optional(string()),
});

const ShareRecordSchema = object({
  branchId: BranchIdSchema,
  channel: picklist(["email", "print", "whatsapp"]),
  docId: optional(string()),
  patientId: optional(string()),
  recipient: pipe(string(), minLength(1, "Recipient is required")),
  recipientConfirm: picklist(["no", "yes"]),
  sharedBy: Id,
});

const ShareLogFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  patientId: optional(string()),
});

const AppendAddendumSchema = object({
  authorId: Id,
  branchId: BranchIdSchema,
  encounterId: Id,
  note: pipe(string(), minLength(1, "Addendum note is required")),
});

const AddendumFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  encounterId: optional(string()),
});

const BreakGlassSchema = object({
  accessedBy: Id,
  branchId: BranchIdSchema,
  patientId: Id,
  reason: pipe(string(), minLength(1, "Break-glass reason is required")),
});

const AppendRegisterSchema = object({
  branchId: BranchIdSchema,
  details: pipe(string(), minLength(1, "Entry details are required")),
  enteredBy: Id,
  register: picklist(["birth", "death", "lab", "mlc", "opd", "pharmacy", "radio", "referral"]),
});

const VoidRegisterSchema = object({
  branchId: BranchIdSchema,
  entryId: Id,
  reason: pipe(string(), minLength(1, "Void reason is required")),
  voidedBy: Id,
});

const RegisterFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  register: optional(string()),
});

const MergeRecordsSchema = object({
  branchId: BranchIdSchema,
  duplicateId: Id,
  mergedBy: Id,
  primaryId: Id,
});

const CheckRetentionSchema = object({
  branchId: BranchIdSchema,
  patientId: optional(string()),
});

const TimelineQuerySchema = object({
  branchId: BranchIdSchema,
  patientId: Id,
});

const EncounterGetSchema = object({
  branchId: BranchIdSchema,
  encounterId: Id,
});

const SearchRecordsSchema = object({
  branchId: BranchIdSchema,
  q: pipe(string(), minLength(1, "Search text is required")),
});

const ConsentsGetSchema = object({
  branchId: BranchIdSchema,
  patientId: Id,
});

const RecordConsentSchema = object({
  branchId: BranchIdSchema,
  encounterId: optional(string()),
  grantedBy: optional(string()),
  kind: pipe(string(), minLength(1, "Consent kind is required")),
  patientId: Id,
});

const IssueDischargeSchema = object({
  branchId: BranchIdSchema,
  encounterId: Id,
  issuedBy: Id,
  summary: pipe(string(), minLength(1, "Discharge summary is required")),
});

const DischargeFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  encounterId: optional(string()),
});

const SendMessageSchema = object({
  branchId: BranchIdSchema,
  channel: optional(picklist(["sms", "whatsapp"])),
  patientId: optional(string()),
  template: pipe(string(), minLength(1, "Template is required")),
  to: pipe(string(), minLength(1, "Recipient is required")),
});

const RetryMessageSchema = object({
  branchId: BranchIdSchema,
  messageId: Id,
});

const OptOutMessageSchema = object({
  branchId: BranchIdSchema,
  channel: optional(picklist(["sms", "whatsapp"])),
  to: pipe(string(), minLength(1, "Recipient is required")),
});

const MessageFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  status: optional(picklist(["delivered", "failed", "queued", "read", "sent"])),
});

const RecordsIdSchema = object({
  branchId: BranchIdSchema,
  id: Id,
});

type AttachDocumentInput = InferOutput<typeof AttachDocumentSchema>;
type UpdateDocumentInput = InferOutput<typeof UpdateDocumentSchema>;
type DocumentFilters = InferOutput<typeof DocumentFiltersSchema>;
type ShareRecordInput = InferOutput<typeof ShareRecordSchema>;
type ShareLogFilters = InferOutput<typeof ShareLogFiltersSchema>;
type AppendAddendumInput = InferOutput<typeof AppendAddendumSchema>;
type AddendumFilters = InferOutput<typeof AddendumFiltersSchema>;
type BreakGlassInput = InferOutput<typeof BreakGlassSchema>;
type AppendRegisterInput = InferOutput<typeof AppendRegisterSchema>;
type VoidRegisterInput = InferOutput<typeof VoidRegisterSchema>;
type RegisterFilters = InferOutput<typeof RegisterFiltersSchema>;
type MergeRecordsInput = InferOutput<typeof MergeRecordsSchema>;
type CheckRetentionInput = InferOutput<typeof CheckRetentionSchema>;
type TimelineQueryInput = InferOutput<typeof TimelineQuerySchema>;
type EncounterGetInput = InferOutput<typeof EncounterGetSchema>;
type SearchRecordsInput = InferOutput<typeof SearchRecordsSchema>;
type ConsentsGetInput = InferOutput<typeof ConsentsGetSchema>;
type RecordConsentInput = InferOutput<typeof RecordConsentSchema>;
type IssueDischargeInput = InferOutput<typeof IssueDischargeSchema>;
type DischargeFilters = InferOutput<typeof DischargeFiltersSchema>;
type SendMessageInput = InferOutput<typeof SendMessageSchema>;
type RetryMessageInput = InferOutput<typeof RetryMessageSchema>;
type OptOutMessageInput = InferOutput<typeof OptOutMessageSchema>;
type MessageFilters = InferOutput<typeof MessageFiltersSchema>;
type RecordsIdInput = InferOutput<typeof RecordsIdSchema>;

export {
  AddendumFiltersSchema,
  AppendAddendumSchema,
  AppendRegisterSchema,
  AttachDocumentSchema,
  BreakGlassSchema,
  CheckRetentionSchema,
  ConsentsGetSchema,
  DischargeFiltersSchema,
  DocumentFiltersSchema,
  EncounterGetSchema,
  IssueDischargeSchema,
  MergeRecordsSchema,
  MessageFiltersSchema,
  OptOutMessageSchema,
  RecordConsentSchema,
  RecordsIdSchema,
  RegisterFiltersSchema,
  RetryMessageSchema,
  SearchRecordsSchema,
  SendMessageSchema,
  ShareLogFiltersSchema,
  ShareRecordSchema,
  TimelineQuerySchema,
  UpdateDocumentSchema,
  VoidRegisterSchema,
};

export type {
  AddendumFilters,
  AppendAddendumInput,
  AppendRegisterInput,
  AttachDocumentInput,
  BreakGlassInput,
  CheckRetentionInput,
  ConsentsGetInput,
  DischargeFilters,
  DocumentFilters,
  EncounterGetInput,
  IssueDischargeInput,
  MergeRecordsInput,
  MessageFilters,
  OptOutMessageInput,
  RecordConsentInput,
  RecordsIdInput,
  RegisterFilters,
  RetryMessageInput,
  SearchRecordsInput,
  SendMessageInput,
  ShareLogFilters,
  ShareRecordInput,
  TimelineQueryInput,
  UpdateDocumentInput,
  VoidRegisterInput,
};
