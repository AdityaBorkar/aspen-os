import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { registerHealthcareBridge, unregisterHealthcareBridge } from "#/services/healthcare-bridge";
import {
  automationWorkflows,
  collaborationWorkflows,
  commentWorkflows,
  linkWorkflows,
  projectWorkflows,
  statusWorkflows,
  taskTypeWorkflows,
  taskWorkflows,
  timeEntryWorkflows,
} from "#/workflows";

import { getContext } from "@aspen-os/platform/server";
import type {
  DatabaseUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
  Unit,
} from "@aspen-os/platform/server";

export type TaskModuleConfig = undefined;

function isUnit<TUnit extends Unit>(unit: Unit | undefined, name: TUnit["$name"]): unit is TUnit {
  return unit?.$name === name;
}

export class Tasks implements Module {
  static create(): Tasks {
    return new Tasks(undefined);
  }

  readonly $name = "tasks";
  readonly $dependencies = ["masters"] as const;
  readonly $consumes: readonly string[] = [
    "healthcare.nursing_created",
    "healthcare.encounter_updated",
  ];
  readonly $config: TaskModuleConfig;

  #db: DatabaseUnit | null = null;
  #pubsub: PubSubUnit | null = null;
  #healthcareBridgeTopics: string[] = [];

  constructor(config: TaskModuleConfig) {
    this.$config = config;
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
    this.#healthcareBridgeTopics = await registerHealthcareBridge({
      db: this.#db.db,
      log: ctx.log,
      pubsub: this.#pubsub,
    });
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      await unregisterHealthcareBridge(this.#healthcareBridgeTopics, { pubsub: this.#pubsub });
    }
    this.#healthcareBridgeTopics = [];
    this.#db = null;
    this.#pubsub = null;
  }

  readonly tasks = taskWorkflows;

  readonly projects = projectWorkflows;

  readonly comments = commentWorkflows;

  readonly links = linkWorkflows;

  readonly timeEntries = timeEntryWorkflows;

  readonly statuses = statusWorkflows;

  readonly taskTypes = taskTypeWorkflows;

  readonly automations = automationWorkflows;

  readonly collaboration = collaborationWorkflows;
}
