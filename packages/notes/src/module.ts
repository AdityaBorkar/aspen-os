import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import * as wf from "#/workflows";

import type { Module, ModuleInfra } from "@aspen-os/platform/server";

export type NotesModuleConfig = undefined;

export class Notes implements Module {
  static create(config?: NotesModuleConfig): Notes {
    return new Notes(config);
  }

  readonly $name = "notes";
  readonly $dependencies: readonly string[] = [];
  readonly $config: NotesModuleConfig;

  constructor(config: NotesModuleConfig) {
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

  readonly notes = wf.notes;
}
