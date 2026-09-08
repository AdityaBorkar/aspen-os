import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { registerReconciliation, unregisterReconciliation } from "#/services/reconciliation";
import { CRON_SCHEDULES, SCHEDULED_JOBS } from "#/utils/constants";
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

    await this.#pubsub.schedule({
      cron: CRON_SCHEDULES.ANNOUNCEMENT_SCHEDULER,
      topic: SCHEDULED_JOBS.ANNOUNCEMENT_SCHEDULER,
    });

    this.#reconciliationTopics = await registerReconciliation({
      db: this.#db.db,
      pubsub: this.#pubsub,
    });
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      await this.#pubsub.unschedule(SCHEDULED_JOBS.ANNOUNCEMENT_SCHEDULER);
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
