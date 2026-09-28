export const WAREHOUSE_TYPE = {
  BIN: "bin",
  CUSTOMER: "customer",
  ROOM: "room",
  SHELF: "shelf",
  STOCK: "stock",
  SUPPLIER: "supplier",
  TRANSIT: "transit",
  WIP: "wip",
} as const;

export type WarehouseType = (typeof WAREHOUSE_TYPE)[keyof typeof WAREHOUSE_TYPE];

export const STOCK_ENTRY_PURPOSE = {
  CONSUMPTION_FOR_MANUFACTURE: "consumption_for_manufacture",
  CUSTOMER_PROVIDED_RECEIPT: "customer_provided_receipt",
  MANUFACTURE: "manufacture",
  MATERIAL_ISSUE: "material_issue",
  MATERIAL_RECEIPT: "material_receipt",
  MATERIAL_TRANSFER: "material_transfer",
  REPACK: "repack",
  SEND_TO_SUBCONTRACTOR: "send_to_subcontractor",
  TRANSFER_FOR_MANUFACTURE: "transfer_for_manufacture",
} as const;

export type StockEntryPurpose = (typeof STOCK_ENTRY_PURPOSE)[keyof typeof STOCK_ENTRY_PURPOSE];

export const RECONCILIATION_PURPOSE = {
  OPENING_STOCK: "opening_stock",
  STOCK_RECONCILIATION: "stock_reconciliation",
} as const;

export type ReconciliationPurpose =
  (typeof RECONCILIATION_PURPOSE)[keyof typeof RECONCILIATION_PURPOSE];

export const PICK_LIST_PURPOSE = {
  DELIVERY: "delivery",
  MATERIAL_TRANSFER: "material_transfer",
  TRANSFER_FOR_MANUFACTURE: "transfer_for_manufacture",
} as const;

export type PickListPurpose = (typeof PICK_LIST_PURPOSE)[keyof typeof PICK_LIST_PURPOSE];

export const RESERVATION_STATUS = {
  CANCELLED: "cancelled",
  DELIVERED: "delivered",
  PARTIALLY_DELIVERED: "partially_delivered",
  RESERVED: "reserved",
} as const;

export type ReservationStatus = (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS];

export const DOC_STATUS = {
  CANCELLED: "cancelled",
  DRAFT: "draft",
  SUBMITTED: "submitted",
} as const;

export type DocStatus = (typeof DOC_STATUS)[keyof typeof DOC_STATUS];

export const SERIAL_STATUS = {
  AVAILABLE: "available",
  CANCELLED: "cancelled",
  DELIVERED: "delivered",
  EXPIRED: "expired",
} as const;

export type SerialStatus = (typeof SERIAL_STATUS)[keyof typeof SERIAL_STATUS];

export const BATCH_STATUS = {
  ACTIVE: "active",
  CONSUMED: "consumed",
  EXPIRED: "expired",
} as const;

export type BatchStatus = (typeof BATCH_STATUS)[keyof typeof BATCH_STATUS];

export const VALUATION_METHOD = {
  FIFO: "fifo",
  MOVING_AVERAGE: "moving_average",
} as const;

export type ValuationMethod = (typeof VALUATION_METHOD)[keyof typeof VALUATION_METHOD];

export const RECONCILE_MODE = {
  ALL: "reconcile_all",
  SELECTED: "reconcile_selected",
} as const;

export type ReconcileMode = (typeof RECONCILE_MODE)[keyof typeof RECONCILE_MODE];

export const AUDIT_ENTITY_TYPE = {
  BATCH: "inventory:batch",
  PICK_LIST: "inventory:pick-list",
  PUTAWAY_RULE: "inventory:putaway-rule",
  RECONCILIATION: "inventory:reconciliation",
  RESERVATION: "inventory:reservation",
  SERIAL: "inventory:serial",
  SETTING: "inventory:setting",
  STOCK_ENTRY: "inventory:stock-entry",
  STOCK_LEDGER: "inventory:stock-ledger",
  WAREHOUSE: "inventory:warehouse",
  WAREHOUSE_TYPE: "inventory:warehouse-type",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

export const AUDIT_ACTION = {
  AMENDED: "amended",
  CANCELLED: "cancelled",
  CONSUMED: "consumed",
  CREATED: "created",
  DELIVERED: "delivered",
  DISABLED: "disabled",
  EXPIRED: "expired",
  MOVED: "moved",
  RELEASED: "released",
  SPLIT: "split",
  SUBMITTED: "submitted",
  UPDATED: "updated",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const SCHEDULED_JOBS = {
  REORDER_SCAN: "inventory.reorder-scan",
} as const;

export type ScheduledJob = (typeof SCHEDULED_JOBS)[keyof typeof SCHEDULED_JOBS];

/** Fallback difference account label used by reconciliations. */
export const DEFAULT_DIFFERENCE_ACCOUNT = "Stock Adjustment";

/** Fallback temporary-opening difference account label for opening stock. */
export const DEFAULT_OPENING_DIFFERENCE_ACCOUNT = "Temporary Opening";
