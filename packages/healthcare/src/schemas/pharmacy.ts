import {
  BatchStatusSchema,
  GrnStatusSchema,
  PoStatusSchema,
  SaleStatusSchema,
} from "#/schemas/enums";
import { BranchIdSchema, PaginationSchema } from "#/schemas/utils";

import type { InferOutput } from "valibot";
import {
  array,
  boolean,
  integer,
  maxValue,
  minLength,
  minValue,
  nullable,
  number,
  object,
  optional,
  partial,
  picklist,
  pipe,
  string,
} from "valibot";

const Id = pipe(string(), minLength(1, "ID is required"));
const Qty = pipe(number(), minValue(1, "Quantity must be positive"));
const Money = pipe(number(), minValue(0));

export const ItemUpsertSchema = object({
  branchId: BranchIdSchema,
  coldChain: optional(boolean()),
  gstPct: optional(pipe(number(), minValue(0), maxValue(100))),
  hsn: optional(string()),
  name: pipe(string(), minLength(1, "Item name is required")),
  pack: pipe(string(), minLength(1, "Pack is required")),
  reorderLevel: optional(pipe(number(), minValue(0))),
  salt: pipe(string(), minLength(1, "Salt is required")),
  schedule: picklist(["H", "H1", "X", "OTC"]),
  strength: pipe(string(), minLength(1, "Strength is required")),
});

export const BatchReceiveSchema = object({
  branchId: BranchIdSchema,
  expiry: pipe(string(), minLength(1, "Expiry is required")),
  itemId: Id,
  location: optional(string()),
  lot: pipe(string(), minLength(1, "Lot number is required")),
  mrp: Money,
  qty: Qty,
  rate: Money,
  store: optional(string(), "main-store"),
});

export const SaleFromRxSchema = object({
  branchId: BranchIdSchema,
  fefoOverrideReason: optional(string()),
  items: array(
    object({
      batchId: optional(string()),
      itemId: Id,
      qty: Qty,
      substituteOf: optional(string()),
      substituteReason: optional(string()),
    }),
  ),
  mode: picklist(["cash", "upi", "card", "credit"]),
  patientId: Id,
  prescriptionId: optional(string()),
});

export const PartialCloseSchema = object({
  amount: Money,
  branchId: BranchIdSchema,
  mode: picklist(["cash", "upi", "card", "cheque", "neft"]),
  saleId: Id,
});

export const ReturnSchema = object({
  branchId: BranchIdSchema,
  items: array(
    object({
      batchId: optional(string()),
      disposition: optional(picklist(["restock", "quarantine"])),
      itemId: Id,
      qty: Qty,
    }),
  ),
  originalBillId: Id,
  reason: pipe(string(), minLength(1, "Return reason is required")),
});

export const PoCreateSchema = object({
  branchId: BranchIdSchema,
  items: array(
    object({
      itemId: Id,
      qty: Qty,
    }),
  ),
  note: optional(string()),
  vendor: pipe(string(), minLength(1, "Vendor is required")),
});

export const GrnVerifySchema = object({
  branchId: BranchIdSchema,
  damagedQty: optional(pipe(number(), minValue(0))),
  note: optional(string()),
  poId: Id,
  received: array(
    object({
      damagedQty: optional(pipe(number(), minValue(0))),
      itemId: Id,
      qty: pipe(number(), minValue(0)),
      shortQty: optional(pipe(number(), minValue(0))),
    }),
  ),
  shortQty: optional(pipe(number(), minValue(0))),
  verifiedBy: Id,
});

export const PiBookSchema = object({
  amount: Money,
  branchId: BranchIdSchema,
  grnId: Id,
  gstAmount: optional(Money),
  invoiceNo: pipe(string(), minLength(1, "Vendor invoice number is required")),
});

export const PharmacyCndnSchema = object({
  amount: Money,
  approver: Id,
  branchId: BranchIdSchema,
  gstAmount: optional(Money),
  kind: picklist(["CN", "DN"]),
  reason: pipe(string(), minLength(1, "Reason is required")),
  refId: Id,
  refType: picklist(["po", "pi", "sale"]),
});

export const TransferSchema = object({
  batchId: optional(string()),
  branchId: BranchIdSchema,
  from: optional(string(), "store"),
  itemId: Id,
  note: optional(string()),
  qty: Qty,
  to: picklist(["ward", "daycare", "store"]),
});

export const TransferAcceptSchema = object({
  acceptedBy: Id,
  branchId: BranchIdSchema,
  decision: optional(picklist(["accept", "reject"]), "accept"),
  reason: optional(string()),
  transferId: Id,
});

export const ReorderSuggestSchema = object({
  branchId: BranchIdSchema,
  store: optional(string()),
});

export const PharmacyIdSchema = object({
  branchId: BranchIdSchema,
  id: Id,
});

export const ExpiryAlertQuerySchema = object({
  branchId: BranchIdSchema,
  store: optional(string()),
  withinDays: optional(pipe(number(), minValue(1)), 90),
});

export const StockLedgerQuerySchema = object({
  branchId: BranchIdSchema,
  itemId: optional(string()),
  limit: optional(pipe(number(), integer())),
  store: optional(string()),
});

export const StockCorrectSchema = object({
  batchId: Id,
  branchId: BranchIdSchema,
  correctedBy: Id,
  deltaQty: pipe(number(), integer()),
  reason: pipe(string(), minLength(1, "Correction reason is required")),
});

export const CreatePharmacyItemSchema = ItemUpsertSchema;

export const UpdatePharmacyItemSchema = object({
  gstPct: optional(pipe(number(), minValue(0), maxValue(100))),
  hsn: optional(nullable(string())),
  id: Id,
  name: optional(pipe(string(), minLength(1))),
  reorderLevel: optional(pipe(number(), minValue(0))),
});

export const PharmacyItemFiltersSchema = object({
  branchId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  salt: optional(string()),
  schedule: optional(picklist(["H", "H1", "X", "OTC"])),
});

export const CreatePharmacyBatchSchema = BatchReceiveSchema;

export const UpdatePharmacyBatchSchema = object({
  id: Id,
  location: optional(string()),
  qty: optional(pipe(number(), minValue(0))),
  status: optional(BatchStatusSchema),
});

export const PharmacyBatchFiltersSchema = object({
  branchId: optional(string()),
  itemId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  status: optional(BatchStatusSchema),
});

export const CreatePharmacySaleSchema = SaleFromRxSchema;

export const UpdatePharmacySaleSchema = object({
  id: Id,
  status: optional(SaleStatusSchema),
});

export const PharmacySaleFiltersSchema = object({
  branchId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  patientId: optional(string()),
  status: optional(SaleStatusSchema),
});

export const CreatePharmacyReturnSchema = ReturnSchema;

export const UpdatePharmacyReturnSchema = object({
  id: Id,
  status: optional(string()),
});

export const PharmacyReturnFiltersSchema = object({
  branchId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  originalBillId: optional(string()),
});

export const CreatePurchaseOrderSchema = PoCreateSchema;

export const UpdatePurchaseOrderSchema = object({
  id: Id,
  note: optional(nullable(string())),
  status: optional(PoStatusSchema),
  vendor: optional(pipe(string(), minLength(1))),
});

export const PurchaseOrderFiltersSchema = object({
  branchId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  status: optional(PoStatusSchema),
  vendor: optional(string()),
});

export const CreateGrnSchema = GrnVerifySchema;

export const UpdateGrnSchema = object({
  id: Id,
  status: optional(GrnStatusSchema),
});

export const GrnFiltersSchema = object({
  branchId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  poId: optional(string()),
  status: optional(GrnStatusSchema),
});

export const CreatePurchaseInvoiceSchema = PiBookSchema;

export const UpdatePurchaseInvoiceSchema = object({
  id: Id,
  status: optional(string()),
});

export const PurchaseInvoiceFiltersSchema = object({
  branchId: optional(string()),
  grnId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
});

export const CreateStockTransferSchema = TransferSchema;

export const UpdateStockTransferSchema = object({
  id: Id,
  note: optional(nullable(string())),
  status: optional(string()),
});

export const StockTransferFiltersSchema = object({
  branchId: optional(string()),
  itemId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  status: optional(string()),
});

export const PharmacyItemPatchSchema = partial(UpdatePharmacyItemSchema);
export const PharmacySalePatchSchema = partial(UpdatePharmacySaleSchema);
export const PurchaseOrderPatchSchema = partial(UpdatePurchaseOrderSchema);

export { PaginationSchema };

export type { InferOutput as PharmacyInferOutput };

export type ItemUpsertInput = InferOutput<typeof ItemUpsertSchema>;
export type BatchReceiveInput = InferOutput<typeof BatchReceiveSchema>;
export type SaleFromRxInput = InferOutput<typeof SaleFromRxSchema>;
export type PartialCloseInput = InferOutput<typeof PartialCloseSchema>;
export type ReturnInput = InferOutput<typeof ReturnSchema>;
export type PoCreateInput = InferOutput<typeof PoCreateSchema>;
export type GrnVerifyInput = InferOutput<typeof GrnVerifySchema>;
export type PiBookInput = InferOutput<typeof PiBookSchema>;
export type PharmacyCndnInput = InferOutput<typeof PharmacyCndnSchema>;
export type TransferInput = InferOutput<typeof TransferSchema>;
export type TransferAcceptInput = InferOutput<typeof TransferAcceptSchema>;
export type ReorderSuggestInput = InferOutput<typeof ReorderSuggestSchema>;
export type PharmacyIdInput = InferOutput<typeof PharmacyIdSchema>;
export type ExpiryAlertQueryInput = InferOutput<typeof ExpiryAlertQuerySchema>;
export type StockLedgerQueryInput = InferOutput<typeof StockLedgerQuerySchema>;
export type StockCorrectInput = InferOutput<typeof StockCorrectSchema>;
export type CreatePharmacyItemInput = InferOutput<typeof CreatePharmacyItemSchema>;
export type UpdatePharmacyItemInput = InferOutput<typeof UpdatePharmacyItemSchema>;
export type PharmacyItemFilters = InferOutput<typeof PharmacyItemFiltersSchema>;
export type UpdatePharmacyBatchInput = InferOutput<typeof UpdatePharmacyBatchSchema>;
export type PharmacyBatchFilters = InferOutput<typeof PharmacyBatchFiltersSchema>;
export type UpdatePharmacySaleInput = InferOutput<typeof UpdatePharmacySaleSchema>;
export type PharmacySaleFilters = InferOutput<typeof PharmacySaleFiltersSchema>;
export type UpdatePharmacyReturnInput = InferOutput<typeof UpdatePharmacyReturnSchema>;
export type PharmacyReturnFilters = InferOutput<typeof PharmacyReturnFiltersSchema>;
export type UpdatePurchaseOrderInput = InferOutput<typeof UpdatePurchaseOrderSchema>;
export type PurchaseOrderFilters = InferOutput<typeof PurchaseOrderFiltersSchema>;
export type UpdateGrnInput = InferOutput<typeof UpdateGrnSchema>;
export type GrnFilters = InferOutput<typeof GrnFiltersSchema>;
export type UpdatePurchaseInvoiceInput = InferOutput<typeof UpdatePurchaseInvoiceSchema>;
export type PurchaseInvoiceFilters = InferOutput<typeof PurchaseInvoiceFiltersSchema>;
export type UpdateStockTransferInput = InferOutput<typeof UpdateStockTransferSchema>;
export type StockTransferFilters = InferOutput<typeof StockTransferFiltersSchema>;
