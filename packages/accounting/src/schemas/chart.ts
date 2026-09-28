import {
  AccountTypeSchema,
  DocStatusSchema,
  FiscalYearStatusSchema,
  JournalTypeSchema,
  PartyTypeSchema,
  RootTypeSchema,
} from "#/schemas/enums";

import {
  array,
  boolean,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const CreateAccountSchema = object({
  accountNumber: optional(nullable(string())),
  accountType: AccountTypeSchema,
  isGroup: optional(boolean(), false),
  name: pipe(string(), minLength(1, "Name is required")),
  parentId: optional(nullable(string())),
  rootType: RootTypeSchema,
});

export type CreateAccountInput = InferOutput<typeof CreateAccountSchema>;

export const UpdateAccountSchema = object({
  accountNumber: optional(nullable(string())),
  accountType: optional(AccountTypeSchema),
  isDisabled: optional(boolean()),
  name: optional(pipe(string(), minLength(1, "Name is required"))),
  parentId: optional(nullable(string())),
  rootType: optional(RootTypeSchema),
});

export type UpdateAccountInput = InferOutput<typeof UpdateAccountSchema>;

export const AccountFiltersSchema = object({
  accountType: optional(AccountTypeSchema),
  includeDisabled: optional(boolean()),
  parentId: optional(string()),
  rootType: optional(RootTypeSchema),
});

export type AccountFilters = InferOutput<typeof AccountFiltersSchema>;

export const CreateFiscalYearSchema = object({
  endDate: pipe(string(), minLength(1, "endDate is required")),
  name: pipe(string(), minLength(1, "Name is required")),
  startDate: pipe(string(), minLength(1, "startDate is required")),
});

export type CreateFiscalYearInput = InferOutput<typeof CreateFiscalYearSchema>;

export const FiscalYearFiltersSchema = object({
  status: optional(FiscalYearStatusSchema),
});

export type FiscalYearFilters = InferOutput<typeof FiscalYearFiltersSchema>;

export const JournalLineInputSchema = object({
  accountId: pipe(string(), minLength(1, "accountId is required")),
  credit: optional(number(), 0),
  debit: optional(number(), 0),
  isAdvance: optional(boolean(), false),
  partyId: optional(nullable(string())),
  partyType: optional(nullable(PartyTypeSchema)),
  referenceId: optional(nullable(string())),
  referenceType: optional(nullable(string())),
});

export type JournalLineInput = InferOutput<typeof JournalLineInputSchema>;

export const CreateJournalEntrySchema = object({
  entryType: optional(JournalTypeSchema, "journal"),
  isAdvance: optional(boolean(), false),
  lines: pipe(array(JournalLineInputSchema), minLength(2, "At least two lines are required")),
  narration: optional(nullable(string())),
  postingDate: pipe(string(), minLength(1, "postingDate is required")),
  referenceId: optional(nullable(string())),
  referenceType: optional(nullable(string())),
});

export type CreateJournalEntryInput = InferOutput<typeof CreateJournalEntrySchema>;

export const JournalFiltersSchema = object({
  entryType: optional(JournalTypeSchema),
  fromDate: optional(string()),
  status: optional(DocStatusSchema),
  toDate: optional(string()),
});

export type JournalFilters = InferOutput<typeof JournalFiltersSchema>;

export const GlFiltersSchema = object({
  accountId: optional(string()),
  fiscalYear: optional(string()),
  fromDate: optional(string()),
  partyId: optional(string()),
  toDate: optional(string()),
  voucherId: optional(string()),
  voucherType: optional(string()),
});

export type GlFilters = InferOutput<typeof GlFiltersSchema>;
