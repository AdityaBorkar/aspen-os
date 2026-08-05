import type { Module, ModuleInfra } from "@aspen-os/platform/server";

import { control_plane_schemas, tenant_schemas } from "./db-schemas";
import { events } from "./pubsub-events";
import { acl } from "./utils/acl";
import { automations } from "./workflows/automation";
import { collaboration } from "./workflows/collaboration";
import { comments } from "./workflows/comment";
import { links } from "./workflows/link";
import { projects } from "./workflows/project";
import { reminders } from "./workflows/reminder";
import { statuses } from "./workflows/status";
import { tasks } from "./workflows/task";
import { taskTypes } from "./workflows/task-type";
import { timeEntries } from "./workflows/time-entry";
import { views } from "./workflows/view";

export * from "./types";

export interface TaskModuleConfig {
  enableNotifications?: boolean;
}

export class Tasks implements Module {
  static create(config?: TaskModuleConfig): Tasks {
    return new Tasks(config ?? {});
  }

  readonly $name = "tasks";
  readonly $dependencies: readonly string[] = [];
  readonly $config: TaskModuleConfig;

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

  $initialize() {}

  $prepareRuntime() {}

  $cleanup() {}

  readonly tasks = tasks;
  readonly projects = projects;
  readonly comments = comments;
  readonly links = links;
  readonly timeEntries = timeEntries;
  readonly statuses = statuses;
  readonly taskTypes = taskTypes;
  readonly reminders = reminders;
  readonly automations = automations;
  readonly collaboration = collaboration;
  readonly views = views;
}
