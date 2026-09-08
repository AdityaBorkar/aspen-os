import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { registerReconciliation, unregisterReconciliation } from "#/services/reconciliation";
import * as wf from "#/workflows";

import type { DatabaseUnit, Module, ModuleInfra, PubSubUnit } from "@aspen-os/platform/server";

export interface HrCoreModuleConfig {
  country: "INDIA";
}

export class HrCore implements Module {
  static create(config: HrCoreModuleConfig): HrCore {
    return new HrCore(config);
  }

  readonly $name = "hrCore";
  readonly $dependencies = [] as const;
  readonly $config: HrCoreModuleConfig;

  #db: DatabaseUnit | null = null;
  #pubsub: PubSubUnit | null = null;
  #reconciliationTopics: string[] = [];

  constructor(config: HrCoreModuleConfig) {
    this.$config = config;
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { control_plane_schemas, tenant_schemas },
      events,
    };
  }

  $initialize(units: { db: DatabaseUnit; pubsub: PubSubUnit }): void {
    this.#db = units.db;
    this.#pubsub = units.pubsub;
  }

  async $prepareRuntime(): Promise<void> {
    if (!this.#pubsub || !this.#db) {
      return;
    }

    // Announcement scheduling now via calendar_reminder (targetType=announcement) + single
    // calendar:reminder-scan dispatcher. The old hr:announcement-scheduler minute cron
    // is removed to keep one dispatcher, one reminder_due, one cron.

    this.#reconciliationTopics = await registerReconciliation({
      db: this.#db.db,
      pubsub: this.#pubsub,
    });
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      await unregisterReconciliation(this.#reconciliationTopics, {
        pubsub: this.#pubsub,
      });
    }
    this.#reconciliationTopics = [];
    this.#db = null;
    this.#pubsub = null;
  }

  readonly access = wf.access;

  readonly announcement = wf.announcement;

  readonly employee = wf.employee;

  readonly lifecycle = wf.lifecycle;

  readonly position = wf.position;

  readonly setup = wf.setup;
}
