export const ROOT_TYPE = {
  ASSET: "asset",
  EQUITY: "equity",
  EXPENSE: "expense",
  INCOME: "income",
  LIABILITY: "liability",
} as const;

export type RootType = (typeof ROOT_TYPE)[keyof typeof ROOT_TYPE];

export const ACCOUNT_TYPE = {
  BANK: "bank",
  CASH: "cash",
  EQUITY: "equity",
  EXPENSE: "expense",
  FIXED_ASSET: "fixed_asset",
  INCOME: "income",
  OTHER: "other",
  PAYABLE: "payable",
  RECEIVABLE: "receivable",
  STOCK: "stock",
  TAX: "tax",
} as const;

export type AccountType = (typeof ACCOUNT_TYPE)[keyof typeof ACCOUNT_TYPE];

export const DOC_STATUS = {
  CANCELLED: "cancelled",
  DRAFT: "draft",
  REVERSED: "reversed",
  SUBMITTED: "submitted",
} as const;

export type DocStatus = (typeof DOC_STATUS)[keyof typeof DOC_STATUS];

export const ORDER_STATUS = {
  CANCELLED: "cancelled",
  CLOSED: "closed",
  COMPLETED: "completed",
  DRAFT: "draft",
  ON_HOLD: "on_hold",
  TO_BILL: "to_bill",
  TO_DELIVER: "to_deliver",
  TO_DELIVER_AND_BILL: "to_deliver_and_bill",
  TO_RECEIVE: "to_receive",
  TO_RECEIVE_AND_BILL: "to_receive_and_bill",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const INVOICE_STATUS = {
  CANCELLED: "cancelled",
  CREDIT_NOTE_ISSUED: "credit_note_issued",
  DEBIT_NOTE_ISSUED: "debit_note_issued",
  DRAFT: "draft",
  OVERDUE: "overdue",
  PAID: "paid",
  PARTLY_PAID: "partly_paid",
  RETURN: "return",
  UNPAID: "unpaid",
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

export const PAYMENT_TYPE = {
  PAY: "pay",
  RECEIVE: "receive",
  TRANSFER: "transfer",
} as const;

export type PaymentType = (typeof PAYMENT_TYPE)[keyof typeof PAYMENT_TYPE];

export const DEPRECIATION_METHOD = {
  DOUBLE_DECLINING_BALANCE: "double_declining_balance",
  STRAIGHT_LINE: "straight_line",
  WRITTEN_DOWN_VALUE: "written_down_value",
} as const;

export type DepreciationMethod = (typeof DEPRECIATION_METHOD)[keyof typeof DEPRECIATION_METHOD];

export const ASSET_STATUS = {
  CANCELLED: "cancelled",
  CAPITALIZED: "capitalized",
  DRAFT: "draft",
  FULLY_DEPRECIATED: "fully_depreciated",
  IN_MAINTENANCE: "in_maintenance",
  OUT_OF_ORDER: "out_of_order",
  PARTLY_DEPRECIATED: "partly_depreciated",
  SCRAPPED: "scrapped",
  SOLD: "sold",
  SUBMITTED: "submitted",
} as const;

export type AssetStatus = (typeof ASSET_STATUS)[keyof typeof ASSET_STATUS];

export const CHARGE_TYPE = {
  ACTUAL: "actual",
  ON_NET_TOTAL: "on_net_total",
  ON_PREVIOUS_ROW: "on_previous_row",
} as const;

export type ChargeType = (typeof CHARGE_TYPE)[keyof typeof CHARGE_TYPE];

export const JOURNAL_TYPE = {
  BANK: "bank",
  CASH: "cash",
  CONTRA: "contra",
  DEPRECIATION: "depreciation",
  JOURNAL: "journal",
  OPENING: "opening",
  REVERSAL: "reversal",
  WRITE_OFF: "write_off",
} as const;

export type JournalType = (typeof JOURNAL_TYPE)[keyof typeof JOURNAL_TYPE];

export const QUOTATION_STATUS = {
  CANCELLED: "cancelled",
  DRAFT: "draft",
  EXPIRED: "expired",
  ORDERED: "ordered",
  SUBMITTED: "submitted",
} as const;

export type QuotationStatus = (typeof QUOTATION_STATUS)[keyof typeof QUOTATION_STATUS];

export const FISCAL_YEAR_STATUS = {
  CLOSED: "closed",
  OPEN: "open",
} as const;

export type FiscalYearStatus = (typeof FISCAL_YEAR_STATUS)[keyof typeof FISCAL_YEAR_STATUS];

export const DEPRECIATION_FREQUENCY = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  YEARLY: "yearly",
} as const;

export type DepreciationFrequency =
  (typeof DEPRECIATION_FREQUENCY)[keyof typeof DEPRECIATION_FREQUENCY];

export const SCHEDULE_STATUS = {
  CANCELLED: "cancelled",
  POSTED: "posted",
  SCHEDULED: "scheduled",
} as const;

export type ScheduleStatus = (typeof SCHEDULE_STATUS)[keyof typeof SCHEDULE_STATUS];

export const PARTY_TYPE = {
  CUSTOMER: "customer",
  VENDOR: "vendor",
} as const;

export type PartyType = (typeof PARTY_TYPE)[keyof typeof PARTY_TYPE];

export const MATERIAL_REQUEST_TYPE = {
  MANUFACTURE: "manufacture",
  PURCHASE: "purchase",
  TRANSFER: "transfer",
} as const;

export type MaterialRequestType =
  (typeof MATERIAL_REQUEST_TYPE)[keyof typeof MATERIAL_REQUEST_TYPE];

export const BANK_MATCH_STATUS = {
  MATCHED: "matched",
  RECONCILED: "reconciled",
  UNMATCHED: "unmatched",
} as const;

export type BankMatchStatus = (typeof BANK_MATCH_STATUS)[keyof typeof BANK_MATCH_STATUS];

export const AUDIT_ENTITY_TYPE = {
  ACCOUNT: "accounting:account",
  ASSET: "accounting:asset",
  ASSET_CATEGORY: "accounting:asset_category",
  ASSET_LOCATION: "accounting:asset_location",
  DELIVERY: "accounting:delivery",
  FISCAL_YEAR: "accounting:fiscal_year",
  JOURNAL: "accounting:journal",
  JOURNAL_TEMPLATE: "accounting:journal_template",
  MATERIAL_REQUEST: "accounting:material_request",
  PAYMENT: "accounting:payment",
  PAYMENT_TERM_TEMPLATE: "accounting:payment_term_template",
  PURCHASE_INVOICE: "accounting:purchase_invoice",
  PURCHASE_ORDER: "accounting:purchase_order",
  QUOTATION: "accounting:quotation",
  RECEIPT: "accounting:receipt",
  RFQ: "accounting:rfq",
  SALES_INVOICE: "accounting:sales_invoice",
  SALES_ORDER: "accounting:sales_order",
  SUPPLIER_QUOTATION: "accounting:supplier_quotation",
  TAX_TEMPLATE: "accounting:tax_template",
  TERMS_TEMPLATE: "accounting:terms_template",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

export const AUDIT_ACTION = {
  CANCELLED: "cancelled",
  CLOSED: "closed",
  CREATED: "created",
  DEPRECIATED: "depreciated",
  DISPOSED: "disposed",
  MATCHED: "matched",
  PAID: "paid",
  POSTED: "posted",
  RECONCILED: "reconciled",
  REVERSED: "reversed",
  SUBMITTED: "submitted",
  TRANSFERRED: "transferred",
  UNRECONCILED: "unreconciled",
  UPDATED: "updated",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];
