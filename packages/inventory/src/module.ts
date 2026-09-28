import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { REORDER_SCAN_CRON, registerReorderScan } from "#/services/reorder-scanner";
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

function isDbUnit(unit: Unit | undefined): unit is DatabaseUnit {
  return unit?.$name === "db";
}

function isPubSubUnit(unit: Unit | undefined): unit is PubSubUnit {
  return unit?.$name === "pubsub";
}

export class Inventory implements Module {
  static create(config?: InventoryModuleConfig): Inventory {
    return new Inventory(config ?? {});
  }

  readonly $name = "inventory";
  readonly $dependencies: readonly string[] = ["masters", "products"];
  readonly $consumes: readonly string[] = [];
  readonly $config: Required<InventoryModuleConfig>;

  #db: DatabaseUnit | null = null;
  #pubsub: PubSubUnit | null = null;
  #unregisterReorderScan: (() => Promise<void>) | null = null;

  constructor(config: InventoryModuleConfig) {
    this.$config = { ...DEFAULT_CONFIG, ...config };
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
    if (isDbUnit(db)) {
      this.#db = db;
    }
    if (isPubSubUnit(pubsub)) {
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
    this.#unregisterReorderScan = await registerReorderScan(
      this.#pubsub,
      { audit: ctx.audit, db: this.#db.db },
      this.$config.reorderScanCron,
    );
  }

  async $cleanup(): Promise<void> {
    if (this.#unregisterReorderScan) {
      await this.#unregisterReorderScan();
    }
    this.#unregisterReorderScan = null;
    this.#db = null;
    this.#pubsub = null;
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
