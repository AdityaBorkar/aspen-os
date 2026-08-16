import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { setWorkspaceConfig } from "#/runtime";
import { registerScheduleRunner, unregisterScheduleRunner } from "#/services/schedule-service";
import type { ScheduleDeps } from "#/services/schedule-service";
import type { WorkspaceModuleConfig } from "#/types";
import * as wf from "#/workflows";

import { getContext } from "@aspen-os/platform/server";
import type {
  DatabaseUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
  Unit,
} from "@aspen-os/platform/server";

const DEFAULT_CONFIG: Required<WorkspaceModuleConfig> = {
  maxRecentItems: 50,
  quickSearchLimit: 10,
};

export type { WorkspaceModuleConfig };

function isDatabaseUnit(unit: Unit | undefined): unit is DatabaseUnit {
  return unit?.$name === "db";
}

function isPubSubUnit(unit: Unit | undefined): unit is PubSubUnit {
  return unit?.$name === "pubsub";
}

export class Workspace implements Module {
  static create(config?: WorkspaceModuleConfig): Workspace {
    return new Workspace(config ?? {});
  }

  readonly $name = "workspace";
  readonly $dependencies: readonly string[] = [];
  readonly $config: Required<WorkspaceModuleConfig>;

  #db: DatabaseUnit | null = null;
  #pubsub: PubSubUnit | null = null;
  #runnerTopics: string[] = [];

  constructor(config: WorkspaceModuleConfig) {
    this.$config = { ...DEFAULT_CONFIG, ...config };
    setWorkspaceConfig(this.$config);
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

    const deps: ScheduleDeps = {
      audit: ctx.audit,
      db: this.#db.db,
      pubsub: this.#pubsub,
    };

    this.#runnerTopics = await registerScheduleRunner(deps);
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      await unregisterScheduleRunner(this.#runnerTopics, { pubsub: this.#pubsub });
    }
    this.#runnerTopics = [];
    this.#db = null;
    this.#pubsub = null;
  }

  readonly dashboards = wf.dashboards;
  readonly drafts = wf.drafts;
  readonly pins = wf.pins;
  readonly recent = wf.recent;
  readonly schedules = wf.schedules;
  readonly search = wf.search;
  readonly settings = wf.settings;
  readonly views = wf.views;
  readonly watches = wf.watches;
  readonly widgets = wf.widgets;
}
