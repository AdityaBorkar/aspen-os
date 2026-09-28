import { InvoiceStatusSchema, MaterialRequestTypeSchema, OrderStatusSchema } from "#/schemas/enums";
import { DocumentLineInputSchema } from "#/schemas/sales";

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

export const CreateMaterialRequestSchema = object({
  department: optional(nullable(string())),
  fileId: optional(nullable(string())),
  items: pipe(array(DocumentLineInputSchema), minLength(1, "At least one item is required")),
  requestType: optional(MaterialRequestTypeSchema, "purchase"),
  requiredBy: optional(nullable(string())),
});

export type CreateMaterialRequestInput = InferOutput<typeof CreateMaterialRequestSchema>;

export const MaterialRequestFiltersSchema = object({
  requestType: optional(MaterialRequestTypeSchema),
});

export type MaterialRequestFilters = InferOutput<typeof MaterialRequestFiltersSchema>;

export const CreateRfqSchema = object({
  deadline: optional(nullable(string())),
  fileId: optional(nullable(string())),
  items: pipe(array(DocumentLineInputSchema), minLength(1, "At least one item is required")),
  materialRequestId: optional(nullable(string())),
  requiredBy: optional(nullable(string())),
});

export type CreateRfqInput = InferOutput<typeof CreateRfqSchema>;

export const CreateSupplierQuotationSchema = object({
  fileId: optional(nullable(string())),
  items: pipe(array(DocumentLineInputSchema), minLength(1, "At least one item is required")),
  rfqId: optional(nullable(string())),
  supplierId: pipe(string(), minLength(1, "supplierId is required")),
  taxTemplateId: optional(nullable(string())),
  validUntil: optional(nullable(string())),
});

export type CreateSupplierQuotationInput = InferOutput<typeof CreateSupplierQuotationSchema>;

export const SupplierQuotationFiltersSchema = object({
  rfqId: optional(string()),
  supplierId: optional(string()),
});

export type SupplierQuotationFilters = InferOutput<typeof SupplierQuotationFiltersSchema>;

export const CreatePurchaseOrderSchema = object({
  fileId: optional(nullable(string())),
  items: pipe(array(DocumentLineInputSchema), minLength(1, "At least one item is required")),
  materialRequestId: optional(nullable(string())),
  paymentTermsTemplateId: optional(nullable(string())),
  requiredBy: optional(nullable(string())),
  supplierId: pipe(string(), minLength(1, "supplierId is required")),
  supplierQuotationId: optional(nullable(string())),
  taxTemplateId: optional(nullable(string())),
  termsText: optional(nullable(string())),
});

export type CreatePurchaseOrderInput = InferOutput<typeof CreatePurchaseOrderSchema>;

export const PurchaseOrderFiltersSchema = object({
  status: optional(OrderStatusSchema),
  supplierId: optional(string()),
});

export type PurchaseOrderFilters = InferOutput<typeof PurchaseOrderFiltersSchema>;

export const CreateReceiptNoteSchema = object({
  fileId: optional(nullable(string())),
  items: pipe(array(DocumentLineInputSchema), minLength(1, "At least one item is required")),
  postingDate: pipe(string(), minLength(1, "postingDate is required")),
  purchaseOrderId: optional(nullable(string())),
  qualityNotes: optional(nullable(string())),
  supplierId: pipe(string(), minLength(1, "supplierId is required")),
  warehouseId: optional(nullable(string())),
});

export type CreateReceiptNoteInput = InferOutput<typeof CreateReceiptNoteSchema>;

export const ReceiptFiltersSchema = object({
  purchaseOrderId: optional(string()),
  supplierId: optional(string()),
});

export type ReceiptFilters = InferOutput<typeof ReceiptFiltersSchema>;

export const CreatePurchaseInvoiceSchema = object({
  creditTo: optional(nullable(string())),
  dueDate: optional(nullable(string())),
  fileId: optional(nullable(string())),
  isReturn: optional(boolean(), false),
  items: pipe(array(DocumentLineInputSchema), minLength(1, "At least one item is required")),
  onHold: optional(boolean(), false),
  postingDate: pipe(string(), minLength(1, "postingDate is required")),
  purchaseOrderId: optional(nullable(string())),
  receiptId: optional(nullable(string())),
  returnAgainst: optional(nullable(string())),
  supplierId: pipe(string(), minLength(1, "supplierId is required")),
  supplierInvoiceDate: optional(nullable(string())),
  supplierInvoiceNo: optional(nullable(string())),
  taxTemplateId: optional(nullable(string())),
  termsText: optional(nullable(string())),
  updateStock: optional(boolean(), false),
  withholdingRate: optional(number(), 0),
});

export type CreatePurchaseInvoiceInput = InferOutput<typeof CreatePurchaseInvoiceSchema>;

export const PurchaseInvoiceFiltersSchema = object({
  onHoldOnly: optional(boolean()),
  overdueOnly: optional(boolean()),
  status: optional(InvoiceStatusSchema),
  supplierId: optional(string()),
});

export type PurchaseInvoiceFilters = InferOutput<typeof PurchaseInvoiceFiltersSchema>;
