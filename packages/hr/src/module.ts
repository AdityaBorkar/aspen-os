import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { registerReconciliation, unregisterReconciliation } from "#/services/reconciliation";
import { CRON_SCHEDULES, SCHEDULED_JOBS } from "#/utils/constants";
import * as wf from "#/workflows";

import type { DatabaseUnit, Module, ModuleInfra, PubSubUnit } from "@aspen-os/platform/server";

export interface HrModuleConfig {
  country: "INDIA";
}

export class Hr implements Module {
  static create(config: HrModuleConfig): Hr {
    return new Hr(config);
  }

  readonly $name = "hr";
  readonly $dependencies = [] as const;
  readonly $config: HrModuleConfig;

  #db: DatabaseUnit | null = null;
  #pubsub: PubSubUnit | null = null;
  #reconciliationTopics: string[] = [];

  constructor(config: HrModuleConfig) {
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
    await this.#pubsub.schedule({
      cron: CRON_SCHEDULES.DAILY_ATTENDANCE_SYNC,
      topic: SCHEDULED_JOBS.DAILY_ATTENDANCE_SYNC,
    });
    await this.#pubsub.schedule({
      cron: CRON_SCHEDULES.DAILY_LEAVE_ACCRUAL,
      topic: SCHEDULED_JOBS.DAILY_LEAVE_ACCRUAL,
    });

    this.#reconciliationTopics = await registerReconciliation({
      db: this.#db.db,
      pubsub: this.#pubsub,
    });
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      await this.#pubsub.unschedule(SCHEDULED_JOBS.ANNOUNCEMENT_SCHEDULER);
      await this.#pubsub.unschedule(SCHEDULED_JOBS.DAILY_ATTENDANCE_SYNC);
      await this.#pubsub.unschedule(SCHEDULED_JOBS.DAILY_LEAVE_ACCRUAL);
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

  readonly attendance = wf.attendance;

  readonly employee = wf.employee;

  readonly leave = wf.leave;

  readonly lifecycle = wf.lifecycle;

  readonly overtime = wf.overtime;

  readonly position = wf.position;

  readonly setup = wf.setup;

  readonly shift = wf.shift;
}
