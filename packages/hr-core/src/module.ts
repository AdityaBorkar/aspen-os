import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import * as wf from "#/workflows";

import type { DatabaseUnit, Module, ModuleInfra, PubSubUnit } from "@aspen-os/platform/server";

export interface HrCoreModuleConfig {
  country: "INDIA";
}

export class HrCore implements Module {
  static create(config: HrCoreModuleConfig): HrCore {
    return new HrCore(config);
  }

  readonly $name = "hrCore";
  readonly $dependencies = [] as const;
  readonly $config: HrCoreModuleConfig;

  constructor(config: HrCoreModuleConfig) {
    this.$config = config;
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { control_plane_schemas, tenant_schemas },
      events,
    };
  }

  // hr-core consumes no units at runtime: the reconciliation subscriptions
  // went away with the position/assignment model.
  $initialize(_units: { db: DatabaseUnit; pubsub: PubSubUnit }): void {}

  $prepareRuntime(): void {}

  async $cleanup(): Promise<void> {}

  readonly access = wf.access;

  readonly employee = wf.employee;

  readonly transition = wf.transition;

  readonly payroll = wf.payroll;

  readonly config = wf.config;
}
