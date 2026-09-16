import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import type { EmrConfig } from "#/types";
import * as wf from "#/workflows";

import type { Module, ModuleInfra } from "@aspen-os/platform/server";

export type { EmrConfig };

export class Emr implements Module {
  static create(config?: EmrConfig): Emr {
    return new Emr(config ?? {});
  }

  readonly $name = "emr";
  readonly $dependencies: readonly string[] = ["healthcare"];
  readonly $config: EmrConfig;

  constructor(config: EmrConfig) {
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

  readonly allopathy = wf.allopathy;
  readonly ayush = wf.ayush;
  readonly dental = wf.dental;
  readonly psych = wf.psych;
  readonly rehab = wf.rehab;
}
