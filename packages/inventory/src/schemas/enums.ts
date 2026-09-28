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

import { picklist } from "valibot";

export const WarehouseTypeSchema = picklist(Object.values(WAREHOUSE_TYPE));
export const StockEntryPurposeSchema = picklist(Object.values(STOCK_ENTRY_PURPOSE));
export const ReconciliationPurposeSchema = picklist(Object.values(RECONCILIATION_PURPOSE));
export const PickListPurposeSchema = picklist(Object.values(PICK_LIST_PURPOSE));
export const ReservationStatusSchema = picklist(Object.values(RESERVATION_STATUS));
export const DocStatusSchema = picklist(Object.values(DOC_STATUS));
export const SerialStatusSchema = picklist(Object.values(SERIAL_STATUS));
export const BatchStatusSchema = picklist(Object.values(BATCH_STATUS));
export const ValuationMethodSchema = picklist(Object.values(VALUATION_METHOD));
export const ReconcileModeSchema = picklist(Object.values(RECONCILE_MODE));

export {
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
};
