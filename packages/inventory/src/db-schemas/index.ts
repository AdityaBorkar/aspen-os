import { inventoryAdditionalCost } from "#/db-schemas/additional-cost";
import { inventoryBatch } from "#/db-schemas/batch";
import {
  inventoryBatchStatusEnum,
  inventoryDocStatusEnum,
  inventoryPickListPurposeEnum,
  inventoryReconcileModeEnum,
  inventoryReconciliationPurposeEnum,
  inventoryReservationStatusEnum,
  inventorySerialStatusEnum,
  inventoryStockEntryPurposeEnum,
  inventoryValuationMethodEnum,
  inventoryWarehouseTypeEnum,
} from "#/db-schemas/enums";
import { inventoryPickList } from "#/db-schemas/pick-list";
import { inventoryPickListItem } from "#/db-schemas/pick-list-item";
import { inventoryPutawayRule } from "#/db-schemas/putaway-rule";
import { inventoryReconciliation } from "#/db-schemas/reconciliation";
import { inventoryReconciliationItem } from "#/db-schemas/reconciliation-item";
import { inventoryReservationEntry } from "#/db-schemas/reservation-entry";
import { inventorySerial } from "#/db-schemas/serial";
import { inventorySetting } from "#/db-schemas/setting";
import { inventoryStockEntry } from "#/db-schemas/stock-entry";
import { inventoryStockEntryItem } from "#/db-schemas/stock-entry-item";
import { inventoryStockLedger } from "#/db-schemas/stock-ledger";
import { inventoryWarehouse } from "#/db-schemas/warehouse";
import { inventoryWarehouseType } from "#/db-schemas/warehouse-type";

export { inventoryAdditionalCost } from "#/db-schemas/additional-cost";
export { inventoryBatch } from "#/db-schemas/batch";
export {
  inventoryBatchStatusEnum,
  inventoryDocStatusEnum,
  inventoryPickListPurposeEnum,
  inventoryReconcileModeEnum,
  inventoryReconciliationPurposeEnum,
  inventoryReservationStatusEnum,
  inventorySerialStatusEnum,
  inventoryStockEntryPurposeEnum,
  inventoryValuationMethodEnum,
  inventoryWarehouseTypeEnum,
} from "#/db-schemas/enums";
export { inventoryPickList } from "#/db-schemas/pick-list";
export { inventoryPickListItem } from "#/db-schemas/pick-list-item";
export { inventoryPutawayRule } from "#/db-schemas/putaway-rule";
export { inventoryReconciliation } from "#/db-schemas/reconciliation";
export { inventoryReconciliationItem } from "#/db-schemas/reconciliation-item";
export { inventoryReservationEntry } from "#/db-schemas/reservation-entry";
export { inventorySerial } from "#/db-schemas/serial";
export { inventorySetting } from "#/db-schemas/setting";
export { inventoryStockEntry } from "#/db-schemas/stock-entry";
export { inventoryStockEntryItem } from "#/db-schemas/stock-entry-item";
export { inventoryStockLedger } from "#/db-schemas/stock-ledger";
export { inventoryWarehouse } from "#/db-schemas/warehouse";
export { inventoryWarehouseType } from "#/db-schemas/warehouse-type";

export const inventoryTables = {
  inventoryAdditionalCost,
  inventoryBatch,
  inventoryPickList,
  inventoryPickListItem,
  inventoryPutawayRule,
  inventoryReconciliation,
  inventoryReconciliationItem,
  inventoryReservationEntry,
  inventorySerial,
  inventorySetting,
  inventoryStockEntry,
  inventoryStockEntryItem,
  inventoryStockLedger,
  inventoryWarehouse,
  inventoryWarehouseType,
} as const;

export const inventoryEnums = {
  inventoryBatchStatusEnum,
  inventoryDocStatusEnum,
  inventoryPickListPurposeEnum,
  inventoryReconcileModeEnum,
  inventoryReconciliationPurposeEnum,
  inventoryReservationStatusEnum,
  inventorySerialStatusEnum,
  inventoryStockEntryPurposeEnum,
  inventoryValuationMethodEnum,
  inventoryWarehouseTypeEnum,
} as const;

export const control_plane_schemas = {} as const;
// drizzle-kit pushSchema only emits CREATE TYPE for enums that are direct
// members of the schema map (verified: table-referenced enums alone are
// skipped), so the maps below merge tables and enums.
export const tenant_schemas = { ...inventoryTables, ...inventoryEnums };
