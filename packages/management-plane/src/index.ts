import type { Module, ModuleInfra } from "@aspen-os/framework/server";

import { acl } from "./auth-acl";
import { schemas } from "./db-schemas";
import { events } from "./pubsub-events";
import { users } from "./workflows/platform-user";
import { serviceProviders } from "./workflows/service-provider";
import { tenants } from "./workflows/tenant";

export * from "./types";

export type ManagementPlaneConfig = undefined;

export class ManagementPlane implements Module {
  static create(config: ManagementPlaneConfig): ManagementPlane {
    return new ManagementPlane(config);
  }

  readonly $name = "management-plane";
  readonly $dependencies = ["organization"];
  readonly $config: ManagementPlaneConfig;

  constructor(config: ManagementPlaneConfig) {
    this.$config = config;
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { schemas },
      events,
    };
  }

  $initialize() {}

  $prepareRuntime() {}

  $cleanup() {}

  readonly serviceProviders = serviceProviders;
  readonly tenants = tenants;
  readonly users = users;
}
