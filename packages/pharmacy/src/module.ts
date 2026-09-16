import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import type { PharmacyConfig } from "#/types";
import * as wf from "#/workflows";

import type { Module, ModuleInfra } from "@aspen-os/platform/server";

export type { PharmacyConfig };

export class Pharmacy implements Module {
  static create(config?: PharmacyConfig): Pharmacy {
    return new Pharmacy(config ?? {});
  }

  readonly $name = "pharmacy";
  readonly $dependencies: readonly string[] = ["healthcare"];
  readonly $config: PharmacyConfig;

  constructor(config: PharmacyConfig) {
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

  readonly pharmacy = wf.pharmacy;
}
