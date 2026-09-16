import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import * as wf from "#/workflows";

import type { Module, ModuleInfra } from "@aspen-os/platform/server";

export interface HrAnnouncementModuleConfig {
  country: "INDIA";
}

export class HrAnnouncement implements Module {
  static create(config: HrAnnouncementModuleConfig): HrAnnouncement {
    return new HrAnnouncement(config);
  }

  readonly $name = "hrAnnouncement";
  readonly $dependencies = ["hrCore"] as const;
  readonly $config: HrAnnouncementModuleConfig;

  constructor(config: HrAnnouncementModuleConfig) {
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
