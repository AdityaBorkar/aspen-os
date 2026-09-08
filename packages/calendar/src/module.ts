import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { registerComplianceBridge, unregisterComplianceBridge } from "#/services/compliance-bridge";
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
  complianceEnabled: true,
  reminderScanCron: "* * * * *",
  tasksEnabled: true,
};

export type { CalendarModuleConfig };

function isUnit<TUnit extends Unit>(unit: Unit | undefined, name: TUnit["$name"]): unit is TUnit {
  return unit?.$name === name;
}

export class Calendar implements Module {
  static create(config?: CalendarModuleConfig): Calendar {
    return new Calendar(config ?? {});
  }

  readonly $name = "calendar";
  readonly $dependencies: readonly string[] = [];
  /**
   * Optional peer topics consumed by the bridges. Introspection-only —
   * never validated, so calendar runs solo or without peers. Set
   * `tasksEnabled: false` / `complianceEnabled: false` to skip.
   */
  readonly $consumes: readonly string[] = [
    "task:due_date_changed",
    "task:deleted",
    "task:status_changed",
    "compliance:document_expiring",
    "compliance:document_due",
    "compliance:document_archived",
    "compliance:document_deleted",
  ];
  readonly $config: Required<CalendarModuleConfig>;

  #db: DatabaseUnit | null = null;
  #pubsub: PubSubUnit | null = null;
  #reminderScanTopic: string | null = null;
  #taskBridgeTopics: string[] = [];
  #complianceBridgeTopics: string[] = [];

  constructor(config: CalendarModuleConfig) {
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
    if (isUnit<DatabaseUnit>(db, "db")) {
      this.#db = db;
    }
    if (isUnit<PubSubUnit>(pubsub, "pubsub")) {
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

    this.#reminderScanTopic = await registerReminderDispatcher({
      ...deps,
      cron: this.$config.reminderScanCron,
    });
    this.#taskBridgeTopics = await registerTaskBridge(deps, {
      enabled: this.$config.tasksEnabled,
    });
    this.#complianceBridgeTopics = await registerComplianceBridge(deps, {
      enabled: this.$config.complianceEnabled,
    });
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      await unregisterReminderDispatcher(this.#reminderScanTopic, { pubsub: this.#pubsub });
      await unregisterTaskBridge(this.#taskBridgeTopics, { pubsub: this.#pubsub });
      await unregisterComplianceBridge(this.#complianceBridgeTopics, { pubsub: this.#pubsub });
    }
    this.#reminderScanTopic = null;
    this.#taskBridgeTopics = [];
    this.#complianceBridgeTopics = [];
    this.#db = null;
    this.#pubsub = null;
  }

  readonly attendees = wf.attendees;
  readonly calendars = wf.calendars;
  readonly events = wf.events;
  readonly reminders = wf.reminders;
}
