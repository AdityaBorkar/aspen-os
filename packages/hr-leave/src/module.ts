import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { CRON_SCHEDULES, SCHEDULED_JOBS } from "#/utils/constants";
import * as wf from "#/workflows";

import type { DatabaseUnit, Module, ModuleInfra, PubSubUnit } from "@aspen-os/platform/server";

export interface HrLeaveModuleConfig {
  country: "INDIA";
}

export class HrLeave implements Module {
  static create(config: HrLeaveModuleConfig): HrLeave {
    return new HrLeave(config);
  }

  readonly $name = "hrLeave";
  readonly $dependencies = [] as const;
  readonly $config: HrLeaveModuleConfig;

  #db: DatabaseUnit | null = null;
  #pubsub: PubSubUnit | null = null;

  constructor(config: HrLeaveModuleConfig) {
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
      cron: CRON_SCHEDULES.DAILY_LEAVE_ACCRUAL,
      topic: SCHEDULED_JOBS.DAILY_LEAVE_ACCRUAL,
    });
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      await this.#pubsub.unschedule(SCHEDULED_JOBS.DAILY_LEAVE_ACCRUAL);
    }
    this.#db = null;
    this.#pubsub = null;
  }

  readonly leave = wf.leave;
}
