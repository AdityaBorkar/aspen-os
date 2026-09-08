import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";

import type { Module, ModuleInfra } from "@aspen-os/platform/server";

export interface OrganizationConfig {
  country: "INDIA";
}

export class Organization implements Module {
  static create(config: OrganizationConfig = { country: "INDIA" }): Organization {
    return new Organization(config);
  }

  readonly $name = "organization";
  readonly $dependencies: readonly string[] = [];
  /** Reserved for future country-specific validation. Currently unused. */
  readonly $config: OrganizationConfig;

  constructor(config: OrganizationConfig) {
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
}
