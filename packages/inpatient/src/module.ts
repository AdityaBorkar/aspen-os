import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import type { InpatientConfig } from "#/types";
import * as wf from "#/workflows";

import type { Module, ModuleInfra } from "@aspen-os/platform/server";

export type { InpatientConfig };

export class Inpatient implements Module {
  static create(config?: InpatientConfig): Inpatient {
    return new Inpatient(config ?? {});
  }

  readonly $name = "inpatient";
  readonly $dependencies: readonly string[] = ["healthcare"];
  readonly $config: InpatientConfig;

  constructor(config: InpatientConfig) {
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

  readonly nursing = wf.nursing;
  readonly residents = wf.residents;
}
