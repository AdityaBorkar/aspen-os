import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import type { DiagnosticsConfig } from "#/types";
import * as wf from "#/workflows";

import type { Module, ModuleInfra } from "@aspen-os/platform/server";

export type { DiagnosticsConfig };

export class Diagnostics implements Module {
  static create(config?: DiagnosticsConfig): Diagnostics {
    return new Diagnostics(config ?? {});
  }

  readonly $name = "diagnostics";
  readonly $dependencies: readonly string[] = ["healthcare"];
  readonly $config: DiagnosticsConfig;

  constructor(config: DiagnosticsConfig) {
    this.$config = config;
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { control_plane_schemas, tenant_schemas },
      events,
    };
  }

  $initialize(): void {}

  $prepareRuntime(): void {}

  $cleanup(): void {}

  readonly diagnostics = wf.diagnostics;
}
