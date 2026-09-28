import { InvoiceStatusSchema, OrderStatusSchema, QuotationStatusSchema } from "#/schemas/enums";

import {
  array,
  boolean,
  gtValue,
  maxValue,
  minLength,
  minValue,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const DocumentLineInputSchema = object({
  discountAmount: optional(pipe(number(), minValue(0, "Discount cannot be negative")), 0),
  discountPercent: optional(
    pipe(
      number(),
      minValue(0, "Discount cannot be negative"),
      maxValue(100, "Discount cannot exceed 100"),
    ),
    0,
  ),
  expenseAccount: optional(nullable(string())),
  incomeAccount: optional(nullable(string())),
  itemId: pipe(string(), minLength(1, "itemId is required")),
  itemName: optional(nullable(string())),
  itemTaxTemplateId: optional(nullable(string())),
  qty: optional(pipe(number(), gtValue(0, "Quantity must be positive")), 1),
  rate: optional(pipe(number(), minValue(0, "Rate cannot be negative")), 0),
  uom: optional(nullable(string())),
  uomFactor: optional(pipe(number(), gtValue(0, "UOM factor must be positive")), 1),
  warehouseId: optional(nullable(string())),
});

export type DocumentLineInput = InferOutput<typeof DocumentLineInputSchema>;

export const CreateQuotationSchema = object({
  fileId: optional(nullable(string())),
  items: pipe(array(DocumentLineInputSchema), minLength(1, "At least one item is required")),
  partyId: pipe(string(), minLength(1, "partyId is required")),
  partyType: optional(string(), "customer"),
  postingDate: pipe(string(), minLength(1, "postingDate is required")),
  taxTemplateId: optional(nullable(string())),
  termsText: optional(nullable(string())),
  validUntil: optional(nullable(string())),
});

export type CreateQuotationInput = InferOutput<typeof CreateQuotationSchema>;

export const QuotationFiltersSchema = object({
  partyId: optional(string()),
  status: optional(QuotationStatusSchema),
});

export type QuotationFilters = InferOutput<typeof QuotationFiltersSchema>;

export const CreateSalesOrderSchema = object({
  customerId: pipe(string(), minLength(1, "customerId is required")),
  customerPoDate: optional(nullable(string())),
  customerPoNo: optional(nullable(string())),
  deliveryDate: optional(nullable(string())),
  fileId: optional(nullable(string())),
  items: pipe(array(DocumentLineInputSchema), minLength(1, "At least one item is required")),
  paymentTermsTemplateId: optional(nullable(string())),
  quotationId: optional(nullable(string())),
  taxTemplateId: optional(nullable(string())),
  termsText: optional(nullable(string())),
  warehouseId: optional(nullable(string())),
});

export type CreateSalesOrderInput = InferOutput<typeof CreateSalesOrderSchema>;

export const UpdateSalesOrderItemsSchema = object({
  items: pipe(array(DocumentLineInputSchema), minLength(1, "At least one item is required")),
});

export type UpdateSalesOrderItemsInput = InferOutput<typeof UpdateSalesOrderItemsSchema>;

export const SalesOrderFiltersSchema = object({
  customerId: optional(string()),
  status: optional(OrderStatusSchema),
});

export type SalesOrderFilters = InferOutput<typeof SalesOrderFiltersSchema>;

export const CreateDeliveryNoteSchema = object({
  customerId: pipe(string(), minLength(1, "customerId is required")),
  fileId: optional(nullable(string())),
  items: pipe(array(DocumentLineInputSchema), minLength(1, "At least one item is required")),
  postingDate: pipe(string(), minLength(1, "postingDate is required")),
  salesOrderId: optional(nullable(string())),
  warehouseId: optional(nullable(string())),
});

export type CreateDeliveryNoteInput = InferOutput<typeof CreateDeliveryNoteSchema>;

export const DeliveryFiltersSchema = object({
  customerId: optional(string()),
  salesOrderId: optional(string()),
});

export type DeliveryFilters = InferOutput<typeof DeliveryFiltersSchema>;

export const CreateSalesInvoiceSchema = object({
  customerId: pipe(string(), minLength(1, "customerId is required")),
  customerPoDate: optional(nullable(string())),
  customerPoNo: optional(nullable(string())),
  deliveryId: optional(nullable(string())),
  dueDate: optional(nullable(string())),
  fileId: optional(nullable(string())),
  isRateAdjustment: optional(boolean(), false),
  isReturn: optional(boolean(), false),
  items: pipe(array(DocumentLineInputSchema), minLength(1, "At least one item is required")),
  paymentTermsTemplateId: optional(nullable(string())),
  postingDate: pipe(string(), minLength(1, "postingDate is required")),
  returnAgainst: optional(nullable(string())),
  salesOrderId: optional(nullable(string())),
  taxTemplateId: optional(nullable(string())),
  termsText: optional(nullable(string())),
  updateStock: optional(boolean(), false),
  warehouseId: optional(nullable(string())),
});

export type CreateSalesInvoiceInput = InferOutput<typeof CreateSalesInvoiceSchema>;

export const SalesInvoiceFiltersSchema = object({
  customerId: optional(string()),
  overdueOnly: optional(boolean()),
  status: optional(InvoiceStatusSchema),
});

export type SalesInvoiceFilters = InferOutput<typeof SalesInvoiceFiltersSchema>;
