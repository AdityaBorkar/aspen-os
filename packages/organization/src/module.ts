import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { activateBranch } from "#/workflows/branch/activate";
import { archiveBranch } from "#/workflows/branch/archive";
import { closeBranch } from "#/workflows/branch/close";
import { createBranch } from "#/workflows/branch/create";
import { deactivateBranch } from "#/workflows/branch/deactivate";
import { getBranch } from "#/workflows/branch/get";
import { listBranches } from "#/workflows/branch/list";
import { restoreBranch } from "#/workflows/branch/restore";
import { getBranchTree } from "#/workflows/branch/tree";
import { updateBranch } from "#/workflows/branch/update";
import { updateBranding } from "#/workflows/org/branding/update";
import { createOrganization } from "#/workflows/org/create";
import { getOrganization } from "#/workflows/org/get";
import { deleteLogo } from "#/workflows/org/logo/delete";
import { uploadLogo } from "#/workflows/org/logo/upload";
import { updateOrganization } from "#/workflows/org/update";

import type { Module, ModuleInfra } from "@aspen-os/platform/server";

export interface OrganizationConfig {
  country: "INDIA";
}

export class Organization implements Module {
  static create(config: OrganizationConfig): Organization {
    return new Organization(config);
  }

  readonly $name = "organization";
  readonly $dependencies = ["masters"] as const;
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

  readonly branches = {
    activate: activateBranch,
    archive: archiveBranch,
    close: closeBranch,
    create: createBranch,
    deactivate: deactivateBranch,
    get: getBranch,
    list: listBranches,
    restore: restoreBranch,
    tree: getBranchTree,
    update: updateBranch,
  };

  readonly organizations = {
    create: createOrganization,
    deleteLogo,
    get: getOrganization,
    update: updateOrganization,
    updateBranding,
    uploadLogo,
  };
}
