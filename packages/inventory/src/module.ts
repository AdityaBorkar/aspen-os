import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { getInventoryConfig, resetInventoryRuntime, setInventoryConfig } from "#/runtime";
import {
  registerReorderScanHandler,
  registerReorderScanner,
  REORDER_SCAN_CRON,
  unregisterReorderScanner,
} from "#/services/reorder-scanner";
import type { InventoryModuleConfig } from "#/types";
import * as wf from "#/workflows";

import { getContext } from "@aspen-os/platform/server";
import type {
  DatabaseUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
  Unit,
} from "@aspen-os/platform/server";

const DEFAULT_CONFIG: Required<InventoryModuleConfig> = {
  reorderScanCron: REORDER_SCAN_CRON,
};

export type { InventoryModuleConfig };

function isUnit(unit: Unit | undefined, name: "db"): unit is DatabaseUnit;
function isUnit(unit: Unit | undefined, name: "pubsub"): unit is PubSubUnit;
function isUnit(unit: Unit | undefined, name: string): boolean {
  return unit?.$name === name;
}

export class Inventory implements Module {
  static create(config?: InventoryModuleConfig): Inventory {
    return new Inventory(config ?? {});
  }

  readonly $name = "inventory";
  readonly $dependencies: readonly string[] = ["masters", "products"];
  readonly $consumes: readonly string[] = [
    "products.item_created",
    "products.item_updated",
    "products.item_disabled",
    "products.item_price_created",
    "products.item_price_updated",
    "masters.unit_of_measure_updated",
    "accounting.material_request_created",
    "accounting.purchase_order_created",
    "accounting.sales_order_created",
    "accounting.sales_order_updated",
    "accounting.sales_order_closed",
    "accounting.sales_order_cancelled",
    "accounting.receipt_created",
    "accounting.delivery_created",
  ];
  readonly $config: Required<InventoryModuleConfig>;

  #db: DatabaseUnit | null = null;
  #pubsub: PubSubUnit | null = null;
  #reorderScanTopic: string | null = null;

  constructor(config: InventoryModuleConfig) {
    this.$config = { ...DEFAULT_CONFIG, ...config };
    setInventoryConfig(this.$config);
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { control_plane_schemas, tenant_schemas },
      events,
    };
  }

  $initialize(units: Record<string, Unit>): void {
    const { db, pubsub } = units;
    if (isUnit(db, "db")) {
      this.#db = db;
    }
    if (isUnit(pubsub, "pubsub")) {
      this.#pubsub = pubsub;
    }
  }

  async $prepareRuntime(): Promise<void> {
    if (!this.#pubsub || !this.#db) {
      throw new Error("Inventory runtime units not initialized: db and pubsub are required");
    }
    const ctx = getContext();
    if (!ctx.audit) {
      throw new Error("Inventory runtime requires an audit unit in context");
    }
    const config = getInventoryConfig();
    const topic = await registerReorderScanner(this.#pubsub, config.reorderScanCron);
    this.#reorderScanTopic = topic;
    await registerReorderScanHandler(topic, {
      audit: ctx.audit,
      db: this.#db.db,
      pubsub: this.#pubsub,
    });
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      await unregisterReorderScanner(this.#reorderScanTopic, { pubsub: this.#pubsub });
    }
    this.#reorderScanTopic = null;
    this.#db = null;
    this.#pubsub = null;
    resetInventoryRuntime();
  }

  readonly batches = wf.batches;
  readonly ledger = wf.ledger;
  readonly pickLists = wf.pickLists;
  readonly putawayRules = wf.putawayRules;
  readonly reconciliations = wf.reconciliations;
  readonly reorder = wf.reorder;
  readonly reservations = wf.reservations;
  readonly serials = wf.serials;
  readonly settings = wf.settings;
  readonly stockEntries = wf.stockEntries;
  readonly warehouses = wf.warehouses;
  readonly warehouseTypes = wf.warehouseTypes;
}
