import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import * as wf from "#/workflows";

import type { Module, ModuleInfra } from "@aspen-os/platform/server";

export interface AnnouncementModuleConfig {
  country: "INDIA";
}

export class Announcement implements Module {
  static create(config: AnnouncementModuleConfig): Announcement {
    return new Announcement(config);
  }

  readonly $name = "announcement";
  readonly $dependencies = ["hrCore"] as const;
  readonly $config: AnnouncementModuleConfig;

  constructor(config: AnnouncementModuleConfig) {
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

  readonly announcement = wf.announcement;
}
