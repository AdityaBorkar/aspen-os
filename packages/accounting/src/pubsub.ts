export const FISCAL_YEAR_EVENTS = {
  CLOSED: "accounting.fiscal_year_closed",
  STARTED: "accounting.financial_year_started",
} as const;

export const QUOTATION_EVENTS = {
  CANCELLED: "accounting.quotation_cancelled",
  CONVERTED: "accounting.quotation_converted",
  SUBMITTED: "accounting.quotation_submitted",
} as const;

export const SALES_ORDER_EVENTS = {
  CANCELLED: "accounting.sales_order_cancelled",
  CLOSED: "accounting.sales_order_closed",
  CREATED: "accounting.sales_order_created",
  UPDATED: "accounting.sales_order_updated",
} as const;

export const DELIVERY_EVENTS = {
  CANCELLED: "accounting.delivery_cancelled",
  CREATED: "accounting.delivery_created",
} as const;

export const SALES_INVOICE_EVENTS = {
  CANCELLED: "accounting.sales_invoice_cancelled",
  CREATED: "accounting.sales_invoice_created",
  OVERDUE: "accounting.sales_invoice_overdue",
  PAID: "accounting.sales_invoice_paid",
} as const;

export const CREDIT_NOTE_EVENTS = {
  ISSUED: "accounting.credit_note_issued",
} as const;

export const MATERIAL_REQUEST_EVENTS = {
  CREATED: "accounting.material_request_created",
} as const;

export const RFQ_EVENTS = {
  ISSUED: "accounting.rfq_issued",
} as const;

export const SUPPLIER_QUOTATION_EVENTS = {
  CONVERTED: "accounting.supplier_quotation_converted",
  RECEIVED: "accounting.supplier_quotation_received",
} as const;

export const PURCHASE_ORDER_EVENTS = {
  CANCELLED: "accounting.purchase_order_cancelled",
  CLOSED: "accounting.purchase_order_closed",
  CREATED: "accounting.purchase_order_created",
  UPDATED: "accounting.purchase_order_updated",
} as const;

export const RECEIPT_EVENTS = {
  CANCELLED: "accounting.receipt_cancelled",
  CREATED: "accounting.receipt_created",
} as const;

export const PURCHASE_INVOICE_EVENTS = {
  CANCELLED: "accounting.purchase_invoice_cancelled",
  CREATED: "accounting.purchase_invoice_created",
  OVERDUE: "accounting.purchase_invoice_overdue",
  PAID: "accounting.purchase_invoice_paid",
} as const;

export const DEBIT_NOTE_EVENTS = {
  ISSUED: "accounting.debit_note_issued",
} as const;

export const PAYMENT_EVENTS = {
  CREATED: "accounting.payment_created",
  RECONCILED: "accounting.payment_reconciled",
  UNRECONCILED: "accounting.payment_unreconciled",
} as const;

export const BANK_EVENTS = {
  MATCHED: "accounting.bank_matched",
} as const;

export const ASSET_EVENTS = {
  CREATED: "accounting.asset_created",
  DEPRECIATED: "accounting.asset_depreciated",
  DISPOSED: "accounting.asset_disposed",
  TRANSFERRED: "accounting.asset_transferred",
} as const;

export const JOURNAL_EVENTS = {
  CANCELLED: "accounting.journal_cancelled",
  POSTED: "accounting.journal_posted",
  REVERSED: "accounting.journal_reversed",
} as const;

export const events = {
  ASSET_EVENTS,
  BANK_EVENTS,
  CREDIT_NOTE_EVENTS,
  DEBIT_NOTE_EVENTS,
  DELIVERY_EVENTS,
  FISCAL_YEAR_EVENTS,
  JOURNAL_EVENTS,
  MATERIAL_REQUEST_EVENTS,
  PAYMENT_EVENTS,
  PURCHASE_INVOICE_EVENTS,
  PURCHASE_ORDER_EVENTS,
  QUOTATION_EVENTS,
  RECEIPT_EVENTS,
  RFQ_EVENTS,
  SALES_INVOICE_EVENTS,
  SALES_ORDER_EVENTS,
  SUPPLIER_QUOTATION_EVENTS,
};

export interface IdPayload {
  id: string;
}

export interface FiscalYearStartedEvent {
  fiscalYear: { id: string; name: string };
}

export interface FiscalYearClosedEvent {
  fiscalYearId: string;
}

export interface QuotationSubmittedEvent {
  quotationId: string;
}

export interface QuotationCancelledEvent {
  quotationId: string;
}

export interface QuotationConvertedEvent {
  quotationId: string;
  salesOrderId: string;
}

export interface SalesOrderLifecycleEvent {
  salesOrderId: string;
}

export interface DeliveryLifecycleEvent {
  deliveryId: string;
}

export interface SalesInvoiceLifecycleEvent {
  salesInvoiceId: string;
}

export interface CreditNoteIssuedEvent {
  salesInvoiceId: string;
  sourceInvoiceId: string | null;
}

export interface MaterialRequestCreatedEvent {
  materialRequestId: string;
}

export interface RfqIssuedEvent {
  rfqId: string;
}

export interface SupplierQuotationReceivedEvent {
  supplierQuotationId: string;
}

export interface SupplierQuotationConvertedEvent {
  purchaseOrderId: string;
  supplierQuotationId: string;
}

export interface PurchaseOrderLifecycleEvent {
  purchaseOrderId: string;
}

export interface ReceiptLifecycleEvent {
  receiptId: string;
}

export interface PurchaseInvoiceLifecycleEvent {
  purchaseInvoiceId: string;
}

export interface DebitNoteIssuedEvent {
  purchaseInvoiceId: string;
  sourceInvoiceId: string | null;
}

export interface PaymentLifecycleEvent {
  paymentId: string;
}

export interface BankMatchedEvent {
  paymentId: string;
  statementLineId: string;
}

export interface AssetLifecycleEvent {
  assetId: string;
}

export interface AssetDepreciatedEvent {
  assetId: string;
  journalId: string;
  scheduleId: string;
}

export interface JournalLifecycleEvent {
  journalId: string;
}

export interface FiscalYearEventMap {
  [FISCAL_YEAR_EVENTS.CLOSED]: FiscalYearClosedEvent;
  [FISCAL_YEAR_EVENTS.STARTED]: FiscalYearStartedEvent;
}

export interface QuotationEventMap {
  [QUOTATION_EVENTS.CANCELLED]: QuotationCancelledEvent;
  [QUOTATION_EVENTS.CONVERTED]: QuotationConvertedEvent;
  [QUOTATION_EVENTS.SUBMITTED]: QuotationSubmittedEvent;
}

export interface SalesOrderEventMap {
  [SALES_ORDER_EVENTS.CANCELLED]: SalesOrderLifecycleEvent;
  [SALES_ORDER_EVENTS.CLOSED]: SalesOrderLifecycleEvent;
  [SALES_ORDER_EVENTS.CREATED]: SalesOrderLifecycleEvent;
  [SALES_ORDER_EVENTS.UPDATED]: SalesOrderLifecycleEvent;
}

export interface DeliveryEventMap {
  [DELIVERY_EVENTS.CANCELLED]: DeliveryLifecycleEvent;
  [DELIVERY_EVENTS.CREATED]: DeliveryLifecycleEvent;
}

export interface SalesInvoiceEventMap {
  [SALES_INVOICE_EVENTS.CANCELLED]: SalesInvoiceLifecycleEvent;
  [SALES_INVOICE_EVENTS.CREATED]: SalesInvoiceLifecycleEvent;
  [SALES_INVOICE_EVENTS.OVERDUE]: SalesInvoiceLifecycleEvent;
  [SALES_INVOICE_EVENTS.PAID]: SalesInvoiceLifecycleEvent;
}

export interface CreditNoteEventMap {
  [CREDIT_NOTE_EVENTS.ISSUED]: CreditNoteIssuedEvent;
}

export interface MaterialRequestEventMap {
  [MATERIAL_REQUEST_EVENTS.CREATED]: MaterialRequestCreatedEvent;
}

export interface RfqEventMap {
  [RFQ_EVENTS.ISSUED]: RfqIssuedEvent;
}

export interface SupplierQuotationEventMap {
  [SUPPLIER_QUOTATION_EVENTS.CONVERTED]: SupplierQuotationConvertedEvent;
  [SUPPLIER_QUOTATION_EVENTS.RECEIVED]: SupplierQuotationReceivedEvent;
}

export interface PurchaseOrderEventMap {
  [PURCHASE_ORDER_EVENTS.CANCELLED]: PurchaseOrderLifecycleEvent;
  [PURCHASE_ORDER_EVENTS.CLOSED]: PurchaseOrderLifecycleEvent;
  [PURCHASE_ORDER_EVENTS.CREATED]: PurchaseOrderLifecycleEvent;
  [PURCHASE_ORDER_EVENTS.UPDATED]: PurchaseOrderLifecycleEvent;
}

export interface ReceiptEventMap {
  [RECEIPT_EVENTS.CANCELLED]: ReceiptLifecycleEvent;
  [RECEIPT_EVENTS.CREATED]: ReceiptLifecycleEvent;
}

export interface PurchaseInvoiceEventMap {
  [PURCHASE_INVOICE_EVENTS.CANCELLED]: PurchaseInvoiceLifecycleEvent;
  [PURCHASE_INVOICE_EVENTS.CREATED]: PurchaseInvoiceLifecycleEvent;
  [PURCHASE_INVOICE_EVENTS.OVERDUE]: PurchaseInvoiceLifecycleEvent;
  [PURCHASE_INVOICE_EVENTS.PAID]: PurchaseInvoiceLifecycleEvent;
}

export interface DebitNoteEventMap {
  [DEBIT_NOTE_EVENTS.ISSUED]: DebitNoteIssuedEvent;
}

export interface PaymentEventMap {
  [PAYMENT_EVENTS.CREATED]: PaymentLifecycleEvent;
  [PAYMENT_EVENTS.RECONCILED]: PaymentLifecycleEvent;
  [PAYMENT_EVENTS.UNRECONCILED]: PaymentLifecycleEvent;
}

export interface BankEventMap {
  [BANK_EVENTS.MATCHED]: BankMatchedEvent;
}

export interface AssetEventMap {
  [ASSET_EVENTS.CREATED]: AssetLifecycleEvent;
  [ASSET_EVENTS.DEPRECIATED]: AssetDepreciatedEvent;
  [ASSET_EVENTS.DISPOSED]: AssetLifecycleEvent;
  [ASSET_EVENTS.TRANSFERRED]: AssetLifecycleEvent;
}

export interface JournalEventMap {
  [JOURNAL_EVENTS.CANCELLED]: JournalLifecycleEvent;
  [JOURNAL_EVENTS.POSTED]: JournalLifecycleEvent;
  [JOURNAL_EVENTS.REVERSED]: JournalLifecycleEvent;
}

export type AccountingEventMap = FiscalYearEventMap &
  QuotationEventMap &
  SalesOrderEventMap &
  DeliveryEventMap &
  SalesInvoiceEventMap &
  CreditNoteEventMap &
  MaterialRequestEventMap &
  RfqEventMap &
  SupplierQuotationEventMap &
  PurchaseOrderEventMap &
  ReceiptEventMap &
  PurchaseInvoiceEventMap &
  DebitNoteEventMap &
  PaymentEventMap &
  BankEventMap &
  AssetEventMap &
  JournalEventMap;
