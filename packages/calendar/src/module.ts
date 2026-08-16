import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { setCalendarConfig } from "#/runtime";
import {
  registerReminderDispatcher,
  unregisterReminderDispatcher,
} from "#/services/reminder-dispatcher";
import { registerTaskBridge, unregisterTaskBridge } from "#/services/task-bridge";
import type { CalendarModuleConfig } from "#/types";
import * as wf from "#/workflows";

import { getContext } from "@aspen-os/platform/server";
import type {
  DatabaseUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
  Unit,
} from "@aspen-os/platform/server";

const DEFAULT_CONFIG: Required<CalendarModuleConfig> = {
  reminderScanCron: "* * * * *",
};

export type { CalendarModuleConfig };

function isDatabaseUnit(unit: Unit | undefined): unit is DatabaseUnit {
  return unit?.$name === "db";
}

function isPubSubUnit(unit: Unit | undefined): unit is PubSubUnit {
  return unit?.$name === "pubsub";
}

export class Calendar implements Module {
  static create(config?: CalendarModuleConfig): Calendar {
    return new Calendar(config ?? {});
  }

  readonly $name = "calendar";
  readonly $dependencies: readonly string[] = [];
  readonly $config: Required<CalendarModuleConfig>;

  #db: DatabaseUnit | null = null;
  #pubsub: PubSubUnit | null = null;
  #reminderScanTopic: string | null = null;
  #taskBridgeTopics: string[] = [];

  constructor(config: CalendarModuleConfig) {
    this.$config = { ...DEFAULT_CONFIG, ...config };
    setCalendarConfig(this.$config);
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
    if (isDatabaseUnit(db)) {
      this.#db = db;
    }
    if (isPubSubUnit(pubsub)) {
      this.#pubsub = pubsub;
    }
  }

  async $prepareRuntime(): Promise<void> {
    if (!this.#pubsub || !this.#db) {
      return;
    }

    const ctx = getContext();
    if (!ctx.audit) {
      return;
    }

    const deps = {
      audit: ctx.audit,
      db: this.#db.db,
      pubsub: this.#pubsub,
    };

    this.#reminderScanTopic = await registerReminderDispatcher(deps);
    this.#taskBridgeTopics = await registerTaskBridge(deps);
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      await unregisterReminderDispatcher(this.#reminderScanTopic, { pubsub: this.#pubsub });
      await unregisterTaskBridge(this.#taskBridgeTopics, { pubsub: this.#pubsub });
    }
    this.#reminderScanTopic = null;
    this.#taskBridgeTopics = [];
    this.#db = null;
    this.#pubsub = null;
  }

  readonly attendees = wf.attendees;
  readonly calendars = wf.calendars;
  readonly events = wf.events;
  readonly reminders = wf.reminders;
}
