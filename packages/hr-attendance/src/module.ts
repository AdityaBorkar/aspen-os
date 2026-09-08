import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { CRON_SCHEDULES, SCHEDULED_JOBS } from "#/utils/constants";
import * as wf from "#/workflows";

import type { DatabaseUnit, Module, ModuleInfra, PubSubUnit } from "@aspen-os/platform/server";

export interface HrAttendanceModuleConfig {
  country: "INDIA";
}

export class HrAttendance implements Module {
  static create(config: HrAttendanceModuleConfig): HrAttendance {
    return new HrAttendance(config);
  }

  readonly $name = "hrAttendance";
  readonly $dependencies = [] as const;
  readonly $config: HrAttendanceModuleConfig;

  #db: DatabaseUnit | null = null;
  #pubsub: PubSubUnit | null = null;

  constructor(config: HrAttendanceModuleConfig) {
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
      cron: CRON_SCHEDULES.DAILY_ATTENDANCE_SYNC,
      topic: SCHEDULED_JOBS.DAILY_ATTENDANCE_SYNC,
    });
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      await this.#pubsub.unschedule(SCHEDULED_JOBS.DAILY_ATTENDANCE_SYNC);
    }
    this.#db = null;
    this.#pubsub = null;
  }

  readonly attendance = wf.attendance;

  readonly overtime = wf.overtime;

  readonly shift = wf.shift;
}
