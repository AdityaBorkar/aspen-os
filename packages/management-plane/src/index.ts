import type {
  AuthUnit,
  DatabaseUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
} from "@aspen-os/platform/server";

import { acl } from "./auth-acl";
import { schemas } from "./db-schemas";
import { events } from "./pubsub-events";
import { users } from "./workflows/platform-user";
import { serviceProviders } from "./workflows/service-provider";
import { createTenants } from "./workflows/tenant";

export * from "./types";

export type ManagementPlaneConfig = undefined;

export class ManagementPlane implements Module {
  static create(config: ManagementPlaneConfig): ManagementPlane {
    return new ManagementPlane(config);
  }

  readonly $name = "management-plane";
  readonly $dependencies = ["organization"];
  readonly $config: ManagementPlaneConfig;

  #db: DatabaseUnit | null = null;

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

  $initialize(units: {
    db: DatabaseUnit;
    auth: AuthUnit;
    pubsub: PubSubUnit;
  }): void {
    this.#db = units.db;
  }

  $prepareRuntime() {}

  $cleanup() {}

  get tenants() {
    if (!this.#db) throw new Error("ManagementPlane not initialized");
    return createTenants(this.#db);
  }

  readonly serviceProviders = serviceProviders;
  readonly users = users;
}
