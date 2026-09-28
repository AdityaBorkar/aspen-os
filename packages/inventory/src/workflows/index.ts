import {
  createBatch,
  expireBatch,
  getBatch,
  listBatches,
  listExpiringBatches,
  moveBatch,
  splitBatch,
  updateBatch,
} from "#/workflows/batch/manage";
import { listLedgerEntries } from "#/workflows/ledger/list";
import {
  cancelPickList,
  createPickList,
  getPickList,
  listPickLists,
  markPickListConsumed,
  refreshPickListStock,
  reservePickList,
  submitPickList,
  suggestPickListLocations,
  updatePickedQty,
  updatePickList,
} from "#/workflows/pick-list/manage";
import {
  createPutawayRule,
  disablePutawayRule,
  getPutawayRule,
  listPutawayRules,
  previewPutaway,
  updatePutawayRule,
} from "#/workflows/putaway-rule/manage";
import {
  addReconciliationItems,
  createReconciliation,
  getReconciliation,
  updateReconciliation,
} from "#/workflows/reconciliation/manage";
import {
  cancelReconciliation,
  listReconciliations,
  submitReconciliation,
} from "#/workflows/reconciliation/submit";
import {
  consumeReservation,
  createReservation,
  getReservation,
  listReservations,
  releaseManyReservations,
  releaseReservation,
} from "#/workflows/reservation/manage";
import {
  cancelSerial,
  createSerial,
  expireSerial,
  getSerial,
  listSerials,
} from "#/workflows/serial/manage";
import {
  getSetting,
  listReorderBreaches,
  runReorderScan,
  updateSetting,
} from "#/workflows/setting/manage";
import { createStockEntry } from "#/workflows/stock-entry/create";
import {
  amendStockEntry,
  cancelStockEntry,
  listStockEntries,
  updateStockEntry,
} from "#/workflows/stock-entry/manage";
import { getStockEntry, submitStockEntry } from "#/workflows/stock-entry/submit";
import {
  createWarehouseType,
  disableWarehouseType,
  getWarehouseType,
  listWarehouseTypes,
  seedWarehouseTypes,
  updateWarehouseType,
} from "#/workflows/warehouse-type/manage";
import { createWarehouse } from "#/workflows/warehouse/create";
import {
  disableWarehouse,
  getWarehouse,
  listWarehouses,
  updateWarehouse,
} from "#/workflows/warehouse/manage";

export const warehouses = {
  create: createWarehouse,
  disable: disableWarehouse,
  get: getWarehouse,
  list: listWarehouses,
  update: updateWarehouse,
} as const;

export const warehouseTypes = {
  create: createWarehouseType,
  disable: disableWarehouseType,
  get: getWarehouseType,
  list: listWarehouseTypes,
  seed: seedWarehouseTypes,
  update: updateWarehouseType,
} as const;

export const stockEntries = {
  amend: amendStockEntry,
  cancel: cancelStockEntry,
  create: createStockEntry,
  get: getStockEntry,
  list: listStockEntries,
  submit: submitStockEntry,
  update: updateStockEntry,
} as const;

export const ledger = {
  list: listLedgerEntries,
} as const;

export const reconciliations = {
  addItems: addReconciliationItems,
  cancel: cancelReconciliation,
  create: createReconciliation,
  get: getReconciliation,
  list: listReconciliations,
  submit: submitReconciliation,
  update: updateReconciliation,
} as const;

export const reservations = {
  consume: consumeReservation,
  create: createReservation,
  get: getReservation,
  list: listReservations,
  release: releaseReservation,
  releaseMany: releaseManyReservations,
} as const;

export const pickLists = {
  cancel: cancelPickList,
  create: createPickList,
  get: getPickList,
  list: listPickLists,
  markConsumed: markPickListConsumed,
  refreshStock: refreshPickListStock,
  reserve: reservePickList,
  submit: submitPickList,
  suggest: suggestPickListLocations,
  update: updatePickList,
  updatePicked: updatePickedQty,
} as const;

export const putawayRules = {
  create: createPutawayRule,
  disable: disablePutawayRule,
  get: getPutawayRule,
  list: listPutawayRules,
  preview: previewPutaway,
  update: updatePutawayRule,
} as const;

export const serials = {
  cancel: cancelSerial,
  create: createSerial,
  expire: expireSerial,
  get: getSerial,
  list: listSerials,
} as const;

export const batches = {
  create: createBatch,
  expire: expireBatch,
  expiring: listExpiringBatches,
  get: getBatch,
  list: listBatches,
  move: moveBatch,
  split: splitBatch,
  update: updateBatch,
} as const;

export const settings = {
  get: getSetting,
  update: updateSetting,
} as const;

export const reorder = {
  breaches: listReorderBreaches,
  scan: runReorderScan,
} as const;
