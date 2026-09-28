import { PartyTypeSchema, PaymentTypeSchema } from "#/schemas/enums";

import { array, minLength, nullable, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const PaymentAllocationInputSchema = object({
  allocatedAmount: number(),
  referenceId: pipe(string(), minLength(1, "referenceId is required")),
  referenceType: pipe(string(), minLength(1, "referenceType is required")),
});

export type PaymentAllocationInput = InferOutput<typeof PaymentAllocationInputSchema>;

export const CreatePaymentEntrySchema = object({
  allocations: optional(array(PaymentAllocationInputSchema), []),
  fileId: optional(nullable(string())),
  modeOfPayment: optional(nullable(string())),
  paidAmount: number(),
  paidFrom: optional(nullable(string())),
  paidTo: optional(nullable(string())),
  partyId: optional(nullable(string())),
  partyType: optional(nullable(PartyTypeSchema)),
  paymentType: PaymentTypeSchema,
  postingDate: pipe(string(), minLength(1, "postingDate is required")),
  referenceDate: optional(nullable(string())),
  referenceNo: optional(nullable(string())),
});

export type CreatePaymentEntryInput = InferOutput<typeof CreatePaymentEntrySchema>;

export const PaymentFiltersSchema = object({
  partyId: optional(string()),
  paymentType: optional(PaymentTypeSchema),
});

export type PaymentFilters = InferOutput<typeof PaymentFiltersSchema>;

export const ReconcileInputSchema = object({
  allocations: pipe(
    array(PaymentAllocationInputSchema),
    minLength(1, "At least one allocation is required"),
  ),
  paymentId: pipe(string(), minLength(1, "paymentId is required")),
});

export type ReconcileInput = InferOutput<typeof ReconcileInputSchema>;

export const BankStatementImportSchema = object({
  amount: number(),
  bankAccount: pipe(string(), minLength(1, "bankAccount is required")),
  description: optional(nullable(string())),
  referenceNo: optional(nullable(string())),
  statementDate: pipe(string(), minLength(1, "statementDate is required")),
});

export type BankStatementImport = InferOutput<typeof BankStatementImportSchema>;

export const ImportBankStatementSchema = object({
  lines: pipe(array(BankStatementImportSchema), minLength(1, "At least one line is required")),
});

export type ImportBankStatementInput = InferOutput<typeof ImportBankStatementSchema>;

export const MatchBankLineSchema = object({
  paymentId: pipe(string(), minLength(1, "paymentId is required")),
  statementLineId: pipe(string(), minLength(1, "statementLineId is required")),
});

export type MatchBankLineInput = InferOutput<typeof MatchBankLineSchema>;

export const OverdueQuerySchema = object({
  asOf: optional(string()),
  partyId: optional(string()),
});

export type OverdueQuery = InferOutput<typeof OverdueQuerySchema>;

export const AgingQuerySchema = object({
  asOf: optional(string()),
});

export type AgingQuery = InferOutput<typeof AgingQuerySchema>;

export const UnallocatedQuerySchema = object({
  partyId: optional(string()),
  partyType: optional(PartyTypeSchema),
});

export type UnallocatedQuery = InferOutput<typeof UnallocatedQuerySchema>;
