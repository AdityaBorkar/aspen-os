import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
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

import type { Module, ModuleInfra } from "@aspen-os/platform/server";

export type TaskModuleConfig = undefined;

export class Tasks implements Module {
  static create(): Tasks {
    return new Tasks(undefined);
  }

  readonly $name = "tasks";
  readonly $dependencies = ["masters"] as const;
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
