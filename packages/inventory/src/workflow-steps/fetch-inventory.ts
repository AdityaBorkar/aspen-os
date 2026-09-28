import { inventoryBatch } from "#/db-schemas/batch";
import { inventoryPickList } from "#/db-schemas/pick-list";
import { inventoryPutawayRule } from "#/db-schemas/putaway-rule";
import { inventoryReconciliation } from "#/db-schemas/reconciliation";
import { inventoryReservationEntry } from "#/db-schemas/reservation-entry";
import { inventorySerial } from "#/db-schemas/serial";
import { inventoryStockEntry } from "#/db-schemas/stock-entry";
import { inventoryWarehouse } from "#/db-schemas/warehouse";
import { inventoryWarehouseType } from "#/db-schemas/warehouse-type";
import { makeFetchStep } from "#/workflow-steps/fetch-entity";

export const fetchWarehouseStep = makeFetchStep(
  "inventory-fetch-warehouse",
  inventoryWarehouse,
  "Warehouse",
);
export const fetchWarehouseTypeStep = makeFetchStep(
  "inventory-fetch-warehouse-type",
  inventoryWarehouseType,
  "Warehouse type",
);
export const fetchStockEntryStep = makeFetchStep(
  "inventory-fetch-stock-entry",
  inventoryStockEntry,
  "Stock entry",
);
export const fetchReconciliationStep = makeFetchStep(
  "inventory-fetch-reconciliation",
  inventoryReconciliation,
  "Reconciliation",
);
export const fetchReservationStep = makeFetchStep(
  "inventory-fetch-reservation",
  inventoryReservationEntry,
  "Reservation",
);
export const fetchPickListStep = makeFetchStep(
  "inventory-fetch-pick-list",
  inventoryPickList,
  "Pick list",
);
export const fetchPutawayRuleStep = makeFetchStep(
  "inventory-fetch-putaway-rule",
  inventoryPutawayRule,
  "Putaway rule",
);
export const fetchSerialStep = makeFetchStep("inventory-fetch-serial", inventorySerial, "Serial");
export const fetchBatchStep = makeFetchStep("inventory-fetch-batch", inventoryBatch, "Batch");
