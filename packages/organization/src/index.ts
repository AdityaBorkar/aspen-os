import type { Module, ModuleInfra } from "@aspen-os/platform/server";

import { acl } from "./auth-acl";
import { schemas } from "./db-schemas";
import { events } from "./pubsub-events";
import { addresses } from "./workflows/address";
import { bankAccounts } from "./workflows/bank-account";
import { branches } from "./workflows/branch";
import { connections } from "./workflows/connection";
import { organizations } from "./workflows/organization";

export * from "./types";

export type OrganizationConfig = {
  country: "INDIA";
};

export class Organization implements Module {
  static create(config: OrganizationConfig): Organization {
    return new Organization(config);
  }

  readonly $name = "organization";
  readonly $dependencies = [];
  readonly $config: OrganizationConfig;

  constructor(config: OrganizationConfig) {
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

  readonly addresses = addresses;
  readonly bankAccounts = bankAccounts;
  readonly branches = branches;
  readonly connections = connections;
  readonly organizations = organizations;
}
