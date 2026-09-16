import { InvoiceStatusAliasSchema } from "#/schemas/enums";
import { BranchIdSchema, PaginationSchema } from "#/schemas/utils";

import {
  array,
  boolean,
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

const InvoiceLineSchema = object({
  price: pipe(number(), minValue(0)),
  qty: pipe(number(), minValue(1)),
  serviceId: Id,
  source: picklist(["consult", "diagnostics", "package", "pharmacy", "procedure", "stay"]),
});

const CreateInvoiceSchema = object({
  branchId: BranchIdSchema,
  discountPct: optional(pipe(number(), minValue(0), maxValue(100))),
  encounterId: optional(string()),
  gstPct: optional(pipe(number(), minValue(0), maxValue(100))),
  lines: array(InvoiceLineSchema),
  patientId: Id,
  payer: optional(string()),
});

const UpdateInvoiceSchema = object({
  discountPct: optional(pipe(number(), minValue(0), maxValue(100))),
  gstPct: optional(pipe(number(), minValue(0), maxValue(100))),
  invoiceId: Id,
  payer: optional(string()),
});

const InvoiceFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  patientId: optional(string()),
  // Canonical alias axis (HEALTHCARE-SPEC §3.2): accepts every legacy
  // ledger literal plus canonical issued/balanced/cancelled/entered-in-error.
  // Consumers normalize to the ledger via invoiceLedgerStatus() before
  // comparing against the status column; reads project fhir_status via
  // the forward INVOICE_STATUS_MAP.
  status: optional(InvoiceStatusAliasSchema),
});

const FinalizeInvoiceSchema = object({
  branchId: BranchIdSchema,
  invoiceId: Id,
});

const ApplyDiscountSchema = object({
  approver: optional(string()),
  branchId: BranchIdSchema,
  discountPct: pipe(number(), minValue(0), maxValue(100)),
  invoiceId: Id,
  requestedBy: Id,
});

const CollectPaymentSchema = object({
  amount: pipe(number(), minValue(0)),
  branchId: BranchIdSchema,
  episodeId: optional(string()),
  invoiceId: Id,
  isAdvance: optional(boolean()),
  lines: optional(
    array(
      object({
        amount: pipe(number(), minValue(0)),
        mode: picklist(["card", "cash", "cheque", "neft", "upi"]),
        ref: optional(string()),
      }),
    ),
  ),
  mode: picklist(["card", "cash", "cheque", "neft", "upi"]),
  ref: optional(string()),
});

const SettleTabSchema = object({
  branchId: BranchIdSchema,
  episodeId: optional(string()),
  patientId: Id,
});

const CreatePackageBalanceSchema = object({
  branchId: BranchIdSchema,
  packageId: Id,
  patientId: Id,
  price: pipe(number(), minValue(0)),
  validityDays: optional(pipe(number(), minValue(1))),
});

const UpdatePackageBalanceSchema = object({
  packageSaleId: Id,
  status: optional(picklist(["active", "exhausted", "expired"])),
});

const PackageBalanceFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  patientId: optional(string()),
  status: optional(picklist(["active", "exhausted", "expired"])),
});

const RedeemPackageSchema = object({
  branchId: BranchIdSchema,
  packageSaleId: Id,
  qty: optional(pipe(number(), minValue(1)), 1),
  serviceId: Id,
});

const RepriceInvoiceSchema = object({
  branchId: BranchIdSchema,
  invoiceId: Id,
  pricelistId: Id,
});

const IssueCndnSchema = object({
  amount: pipe(number(), minValue(0)),
  approver: Id,
  branchId: BranchIdSchema,
  invoiceId: Id,
  kind: picklist(["CN", "DN"]),
  reason: pipe(string(), minLength(1, "Reason is required")),
});

const CndnFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  invoiceId: optional(string()),
  kind: optional(picklist(["CN", "DN"])),
});

const SettleAdvanceSchema = object({
  amount: pipe(number(), minValue(0)),
  branchId: BranchIdSchema,
  direction: picklist(["adjust", "receive"]),
  episodeId: optional(string()),
  patientId: Id,
});

const AdvanceFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  patientId: optional(string()),
});

const DuesAgingFiltersSchema = object({
  asOf: optional(string()),
  branchId: BranchIdSchema,
});

const CollectionReportSchema = object({
  branchId: BranchIdSchema,
  desk: optional(string()),
  from: optional(string()),
  to: optional(string()),
});

const PackageLiabilitySchema = object({
  branchId: BranchIdSchema,
  includeExpired: optional(boolean()),
});

const GstExportFiltersSchema = object({
  branchId: BranchIdSchema,
  month: optional(string()),
});

const InvoiceIdSchema = object({
  branchId: BranchIdSchema,
  id: Id,
});

const ReceiptFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  invoiceId: optional(string()),
});

type InvoiceLine = InferOutput<typeof InvoiceLineSchema>;
type CreateInvoiceInput = InferOutput<typeof CreateInvoiceSchema>;
type UpdateInvoiceInput = InferOutput<typeof UpdateInvoiceSchema>;
type InvoiceFilters = InferOutput<typeof InvoiceFiltersSchema>;
type FinalizeInvoiceInput = InferOutput<typeof FinalizeInvoiceSchema>;
type ApplyDiscountInput = InferOutput<typeof ApplyDiscountSchema>;
type CollectPaymentInput = InferOutput<typeof CollectPaymentSchema>;
type SettleTabInput = InferOutput<typeof SettleTabSchema>;
type CreatePackageBalanceInput = InferOutput<typeof CreatePackageBalanceSchema>;
type UpdatePackageBalanceInput = InferOutput<typeof UpdatePackageBalanceSchema>;
type PackageBalanceFilters = InferOutput<typeof PackageBalanceFiltersSchema>;
type RedeemPackageInput = InferOutput<typeof RedeemPackageSchema>;
type RepriceInvoiceInput = InferOutput<typeof RepriceInvoiceSchema>;
type IssueCndnInput = InferOutput<typeof IssueCndnSchema>;
type CndnFilters = InferOutput<typeof CndnFiltersSchema>;
type SettleAdvanceInput = InferOutput<typeof SettleAdvanceSchema>;
type AdvanceFilters = InferOutput<typeof AdvanceFiltersSchema>;
type DuesAgingFilters = InferOutput<typeof DuesAgingFiltersSchema>;
type CollectionReportInput = InferOutput<typeof CollectionReportSchema>;
type PackageLiabilityInput = InferOutput<typeof PackageLiabilitySchema>;
type GstExportFilters = InferOutput<typeof GstExportFiltersSchema>;
type InvoiceIdInput = InferOutput<typeof InvoiceIdSchema>;
type ReceiptFilters = InferOutput<typeof ReceiptFiltersSchema>;

export {
  AdvanceFiltersSchema,
  ApplyDiscountSchema,
  CndnFiltersSchema,
  CollectPaymentSchema,
  CollectionReportSchema,
  CreateInvoiceSchema,
  CreatePackageBalanceSchema,
  DuesAgingFiltersSchema,
  FinalizeInvoiceSchema,
  GstExportFiltersSchema,
  InvoiceFiltersSchema,
  InvoiceIdSchema,
  InvoiceLineSchema,
  IssueCndnSchema,
  PackageBalanceFiltersSchema,
  PackageLiabilitySchema,
  ReceiptFiltersSchema,
  RedeemPackageSchema,
  RepriceInvoiceSchema,
  SettleAdvanceSchema,
  SettleTabSchema,
  UpdateInvoiceSchema,
  UpdatePackageBalanceSchema,
};

export type {
  AdvanceFilters,
  ApplyDiscountInput,
  CndnFilters,
  CollectPaymentInput,
  CollectionReportInput,
  CreateInvoiceInput,
  CreatePackageBalanceInput,
  DuesAgingFilters,
  FinalizeInvoiceInput,
  GstExportFilters,
  InvoiceFilters,
  InvoiceIdInput,
  InvoiceLine,
  IssueCndnInput,
  PackageBalanceFilters,
  PackageLiabilityInput,
  ReceiptFilters,
  RedeemPackageInput,
  RepriceInvoiceInput,
  SettleAdvanceInput,
  SettleTabInput,
  UpdateInvoiceInput,
  UpdatePackageBalanceInput,
};
