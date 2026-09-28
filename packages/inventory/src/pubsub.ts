import type {
  PickListPurpose,
  ReconciliationPurpose,
  StockEntryPurpose,
  WarehouseType,
} from "#/utils/constants";

export const WAREHOUSE_EVENTS = {
  CREATED: "inventory.warehouse_created",
  DISABLED: "inventory.warehouse_disabled",
  UPDATED: "inventory.warehouse_updated",
} as const;

export const STOCK_EVENTS = {
  CHANGED: "inventory.stock_changed",
} as const;

export const STOCK_ENTRY_EVENTS = {
  CANCELLED: "inventory.stock_entry_cancelled",
  SUBMITTED: "inventory.stock_entry_submitted",
} as const;

export const RECONCILIATION_EVENTS = {
  SUBMITTED: "inventory.reconciliation_submitted",
} as const;

export const REORDER_EVENTS = {
  TRIGGERED: "inventory.reorder_triggered",
} as const;

export const RESERVATION_EVENTS = {
  CONSUMED: "inventory.reservation_consumed",
  CREATED: "inventory.reservation_created",
  RELEASED: "inventory.reservation_released",
} as const;

export const PICK_LIST_EVENTS = {
  CANCELLED: "inventory.pick_list_cancelled",
  CREATED: "inventory.pick_list_created",
  SUBMITTED: "inventory.pick_list_submitted",
} as const;

export const PUTAWAY_EVENTS = {
  APPLIED: "inventory.putaway_applied",
} as const;

export const SERIAL_EVENTS = {
  CREATED: "inventory.serial_created",
  DELIVERED: "inventory.serial_delivered",
} as const;

export const BATCH_EVENTS = {
  CREATED: "inventory.batch_created",
  EXPIRED: "inventory.batch_expired",
  MOVED: "inventory.batch_moved",
  SPLIT: "inventory.batch_split",
} as const;

export const events = {
  BATCH_EVENTS,
  PICK_LIST_EVENTS,
  PUTAWAY_EVENTS,
  RECONCILIATION_EVENTS,
  REORDER_EVENTS,
  RESERVATION_EVENTS,
  SERIAL_EVENTS,
  STOCK_ENTRY_EVENTS,
  STOCK_EVENTS,
  WAREHOUSE_EVENTS,
};

export interface WarehouseEvent {
  warehouseId: string;
}

export interface WarehouseCreatedEvent extends WarehouseEvent {
  isGroup: boolean;
  name: string;
  parentId?: string;
  warehouseType: WarehouseType;
}

export interface WarehouseUpdatedEvent extends WarehouseEvent {
  accountHead?: string | null;
  addressId?: string | null;
  contactId?: string | null;
  isGroup?: boolean;
  name?: string;
  parentId?: string | null;
  warehouseType?: WarehouseType;
}

export interface StockChangedEvent {
  batchNo?: string;
  isTransitLeg?: boolean;
  itemId: string;
  postingDate: string;
  qtyDelta: number;
  serialNo?: string;
  valuationRate: number;
  voucherId: string;
  voucherType: string;
  warehouseId: string;
}

export interface StockEntryLifecycleEvent {
  additionalCostTotal: number;
  postingDate: string;
  purpose: StockEntryPurpose;
  stockEntryId: string;
}

export interface ReconciliationSubmittedEvent {
  postingDate: string;
  purpose: ReconciliationPurpose;
  reconciliationId: string;
}

export interface ReorderTriggeredEvent {
  availableQty: number;
  itemId: string;
  materialRequestType: string;
  reorderLevel: number;
  reorderQty: number;
  requestForWarehouseId: string;
}

export interface ReservationLifecycleEvent {
  itemId: string;
  reservationId: string;
  warehouseId: string;
}

export interface ReservationConsumedEvent extends ReservationLifecycleEvent {
  consumedQty: number;
}

export interface PickListLifecycleEvent {
  pickListId: string;
  purpose: PickListPurpose;
}

export interface PutawayAppliedEvent {
  splits: { itemId: string; qty: number; warehouseId: string }[];
  stockEntryId: string;
}

export interface SerialLifecycleEvent {
  itemId: string;
  serialId: string;
  serialNo: string;
}

export interface BatchLifecycleEvent {
  batchId: string;
  batchRecordId: string;
  itemId: string;
}

export interface WarehouseEventMap {
  [WAREHOUSE_EVENTS.CREATED]: WarehouseCreatedEvent;
  [WAREHOUSE_EVENTS.DISABLED]: WarehouseEvent;
  [WAREHOUSE_EVENTS.UPDATED]: WarehouseUpdatedEvent;
}

export interface StockEventMap {
  [STOCK_EVENTS.CHANGED]: StockChangedEvent;
}

export interface StockEntryEventMap {
  [STOCK_ENTRY_EVENTS.CANCELLED]: StockEntryLifecycleEvent;
  [STOCK_ENTRY_EVENTS.SUBMITTED]: StockEntryLifecycleEvent;
}

export interface ReconciliationEventMap {
  [RECONCILIATION_EVENTS.SUBMITTED]: ReconciliationSubmittedEvent;
}

export interface ReorderEventMap {
  [REORDER_EVENTS.TRIGGERED]: ReorderTriggeredEvent;
}

export interface ReservationEventMap {
  [RESERVATION_EVENTS.CONSUMED]: ReservationConsumedEvent;
  [RESERVATION_EVENTS.CREATED]: ReservationLifecycleEvent;
  [RESERVATION_EVENTS.RELEASED]: ReservationLifecycleEvent;
}

export interface PickListEventMap {
  [PICK_LIST_EVENTS.CANCELLED]: PickListLifecycleEvent;
  [PICK_LIST_EVENTS.CREATED]: PickListLifecycleEvent;
  [PICK_LIST_EVENTS.SUBMITTED]: PickListLifecycleEvent;
}

export interface PutawayEventMap {
  [PUTAWAY_EVENTS.APPLIED]: PutawayAppliedEvent;
}

export interface SerialEventMap {
  [SERIAL_EVENTS.CREATED]: SerialLifecycleEvent;
  [SERIAL_EVENTS.DELIVERED]: SerialLifecycleEvent;
}

export interface BatchEventMap {
  [BATCH_EVENTS.CREATED]: BatchLifecycleEvent;
  [BATCH_EVENTS.EXPIRED]: BatchLifecycleEvent;
  [BATCH_EVENTS.MOVED]: BatchLifecycleEvent;
  [BATCH_EVENTS.SPLIT]: BatchLifecycleEvent;
}

export type InventoryEventMap = WarehouseEventMap &
  StockEventMap &
  StockEntryEventMap &
  ReconciliationEventMap &
  ReorderEventMap &
  ReservationEventMap &
  PickListEventMap &
  PutawayEventMap &
  SerialEventMap &
  BatchEventMap;
