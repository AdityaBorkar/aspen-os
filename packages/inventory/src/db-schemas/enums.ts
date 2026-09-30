import {
  BATCH_STATUS,
  DOC_STATUS,
  PICK_LIST_PURPOSE,
  RECONCILIATION_PURPOSE,
  RECONCILE_MODE,
  RESERVATION_STATUS,
  SERIAL_STATUS,
  STOCK_ENTRY_PURPOSE,
  VALUATION_METHOD,
  WAREHOUSE_TYPE,
} from "#/utils/constants";

import { pgEnum } from "drizzle-orm/pg-core";

export const inventoryWarehouseTypeEnum = pgEnum("inventory_warehouse_kind", [
  WAREHOUSE_TYPE.STOCK,
  WAREHOUSE_TYPE.WIP,
  WAREHOUSE_TYPE.TRANSIT,
  WAREHOUSE_TYPE.SUPPLIER,
  WAREHOUSE_TYPE.CUSTOMER,
  WAREHOUSE_TYPE.ROOM,
  WAREHOUSE_TYPE.SHELF,
  WAREHOUSE_TYPE.BIN,
]);

export const inventoryStockEntryPurposeEnum = pgEnum("inventory_stock_entry_purpose", [
  STOCK_ENTRY_PURPOSE.MATERIAL_ISSUE,
  STOCK_ENTRY_PURPOSE.MATERIAL_RECEIPT,
  STOCK_ENTRY_PURPOSE.MATERIAL_TRANSFER,
  STOCK_ENTRY_PURPOSE.TRANSFER_FOR_MANUFACTURE,
  STOCK_ENTRY_PURPOSE.CONSUMPTION_FOR_MANUFACTURE,
  STOCK_ENTRY_PURPOSE.MANUFACTURE,
  STOCK_ENTRY_PURPOSE.REPACK,
  STOCK_ENTRY_PURPOSE.SEND_TO_SUBCONTRACTOR,
  STOCK_ENTRY_PURPOSE.CUSTOMER_PROVIDED_RECEIPT,
]);

export const inventoryReconciliationPurposeEnum = pgEnum("inventory_reconciliation_purpose", [
  RECONCILIATION_PURPOSE.OPENING_STOCK,
  RECONCILIATION_PURPOSE.STOCK_RECONCILIATION,
]);

export const inventoryPickListPurposeEnum = pgEnum("inventory_pick_list_purpose", [
  PICK_LIST_PURPOSE.DELIVERY,
  PICK_LIST_PURPOSE.TRANSFER_FOR_MANUFACTURE,
  PICK_LIST_PURPOSE.MATERIAL_TRANSFER,
]);

export const inventoryReservationStatusEnum = pgEnum("inventory_reservation_status", [
  RESERVATION_STATUS.RESERVED,
  RESERVATION_STATUS.PARTIALLY_DELIVERED,
  RESERVATION_STATUS.DELIVERED,
  RESERVATION_STATUS.CANCELLED,
]);

export const inventoryDocStatusEnum = pgEnum("inventory_doc_status", [
  DOC_STATUS.DRAFT,
  DOC_STATUS.SUBMITTED,
  DOC_STATUS.CANCELLED,
]);

export const inventorySerialStatusEnum = pgEnum("inventory_serial_status", [
  SERIAL_STATUS.AVAILABLE,
  SERIAL_STATUS.DELIVERED,
  SERIAL_STATUS.EXPIRED,
  SERIAL_STATUS.CANCELLED,
]);

export const inventoryBatchStatusEnum = pgEnum("inventory_batch_status", [
  BATCH_STATUS.ACTIVE,
  BATCH_STATUS.EXPIRED,
  BATCH_STATUS.CONSUMED,
]);

export const inventoryValuationMethodEnum = pgEnum("inventory_valuation_method", [
  VALUATION_METHOD.FIFO,
  VALUATION_METHOD.MOVING_AVERAGE,
]);
// Single owner of the engine: inventory computes valuation (posting/pricing,
// stock-math) and owns the global default
// (inventory_setting.default_valuation_method). Products owns the per-item
// declaration (products_item.valuation_method). Keep values in sync with
// products VALUATION_METHOD; PG types stay separate by package isolation.

export const inventoryReconcileModeEnum = pgEnum("inventory_reconcile_mode", [
  RECONCILE_MODE.ALL,
  RECONCILE_MODE.SELECTED,
]);
