import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { resetManagementRuntime, setManagementStorage } from "#/runtime";
import { createOrganization } from "#/workflows/organization/create";
import { getOrganization } from "#/workflows/organization/get";
import { listOrganizations } from "#/workflows/organization/list";
import { getOrganizationLogoUrl } from "#/workflows/organization/logo/get-url";
import { removeOrganizationLogo } from "#/workflows/organization/logo/remove";
import { uploadOrganizationLogo } from "#/workflows/organization/logo/upload";
import {
  attachOrganizationLogo,
  issueOrganizationLogoUploadUrl,
} from "#/workflows/organization/logo/upload-url";
import { updateOrganization } from "#/workflows/organization/update";
import { activateSp } from "#/workflows/sp/activate";
import { listAssignedTenants } from "#/workflows/sp/assigned-tenant/list";
import { createSp } from "#/workflows/sp/create";
import { deactivateSp } from "#/workflows/sp/deactivate";
import { getSp } from "#/workflows/sp/get";
import { listSps } from "#/workflows/sp/list";
import { getServiceProviderLogoUrl } from "#/workflows/sp/logo/get-url";
import { removeServiceProviderLogo } from "#/workflows/sp/logo/remove";
import { uploadServiceProviderLogo } from "#/workflows/sp/logo/upload";
import {
  attachServiceProviderLogo,
  issueServiceProviderLogoUploadUrl,
} from "#/workflows/sp/logo/upload-url";
import { updateSp } from "#/workflows/sp/update";
import { listSpUsers } from "#/workflows/sp/user/list";
import { createTenantMember } from "#/workflows/tenant-member/create";
import { getTenantMember } from "#/workflows/tenant-member/get";
import { listTenantMembers } from "#/workflows/tenant-member/list";
import { removeTenantMember } from "#/workflows/tenant-member/remove";
import { updateTenantMember } from "#/workflows/tenant-member/update";
import { activateTenant } from "#/workflows/tenant/activate";
import { getTenantBySlug } from "#/workflows/tenant/by-slug/get";
import { getTenantFullBySlug } from "#/workflows/tenant/by-slug/get-full";
import { resolveTenantDatabase } from "#/workflows/tenant/by-slug/resolve-database";
import { listTenantsByUser } from "#/workflows/tenant/by-user/list";
import { churnTenant } from "#/workflows/tenant/churn";
import { getTenant } from "#/workflows/tenant/get";
import { listTenants } from "#/workflows/tenant/list";
import { listTenantBranding } from "#/workflows/tenant/list-branding";
import { getTenantLogoUrl } from "#/workflows/tenant/logo/get-url";
import { removeTenantLogo } from "#/workflows/tenant/logo/remove";
import { uploadTenantLogo } from "#/workflows/tenant/logo/upload";
import { attachTenantLogo, issueTenantLogoUploadUrl } from "#/workflows/tenant/logo/upload-url";
import { createOnboardTenant } from "#/workflows/tenant/onboard";
import { reactivateTenant } from "#/workflows/tenant/reactivate";
import { assignServiceProvider } from "#/workflows/tenant/sp/assign";
import { unassignServiceProvider } from "#/workflows/tenant/sp/unassign";
import { suspendTenant } from "#/workflows/tenant/suspend";
import { updateTenant } from "#/workflows/tenant/update";
import { createUser } from "#/workflows/user/create";
import { deleteUser } from "#/workflows/user/delete";
import { getUser } from "#/workflows/user/get";
import { listUsers } from "#/workflows/user/list";
import { assignRole } from "#/workflows/user/role/assign";
import { assignToServiceProvider } from "#/workflows/user/sp/assign";
import { updateUser } from "#/workflows/user/update";

import type {
  DatabaseUnit,
  Module,
  ModuleInfra,
  StorageUnit,
  Unit,
} from "@aspen-os/platform/server";

export type ManagementPlaneConfig = undefined;

function isUnit(unit: Unit | undefined, name: "db"): unit is DatabaseUnit;
function isUnit(unit: Unit | undefined, name: "storage"): unit is StorageUnit;
function isUnit(unit: Unit | undefined, name: string): boolean {
  return unit?.$name === name;
}

export class ManagementPlane implements Module {
  static create(config: ManagementPlaneConfig): ManagementPlane {
    return new ManagementPlane(config);
  }

  readonly $name = "management";
  readonly $dependencies: readonly string[] = [];
  readonly $config: ManagementPlaneConfig;

  #db: DatabaseUnit | null = null;

  constructor(config: ManagementPlaneConfig) {
    this.$config = config;
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { control_plane_schemas, tenant_schemas },
      events,
    };
  }

  $initialize(units: Record<string, Unit>): void {
    const { db, storage } = units;
    if (isUnit(db, "db")) {
      this.#db = db;
    }
    if (isUnit(storage, "storage")) {
      setManagementStorage(storage);
    }
  }

  $prepareRuntime() {}

  $cleanup() {
    this.#db = null;
    resetManagementRuntime();
  }

  #requireDb(): DatabaseUnit {
    if (!this.#db) {
      throw new Error("ManagementPlane not initialized");
    }
    return this.#db;
  }

  get tenants() {
    return {
      activate: activateTenant,
      assignServiceProvider,
      attachLogo: attachTenantLogo,
      churn: churnTenant,
      get: getTenant,
      getBySlug: getTenantBySlug,
      getFullBySlug: getTenantFullBySlug,
      getLogoUrl: getTenantLogoUrl,
      issueLogoUploadUrl: issueTenantLogoUploadUrl,
      list: listTenants,
      listBranding: listTenantBranding,
      listByUser: listTenantsByUser,
      onboard: createOnboardTenant(this.#requireDb()),
      reactivate: reactivateTenant,
      removeLogo: removeTenantLogo,
      resolveDatabase: resolveTenantDatabase,
      suspend: suspendTenant,
      unassignServiceProvider,
      update: updateTenant,
      uploadLogo: uploadTenantLogo,
    };
  }

  readonly tenantMembers = {
    create: createTenantMember,
    get: getTenantMember,
    list: listTenantMembers,
    remove: removeTenantMember,
    update: updateTenantMember,
  };

  readonly serviceProviders = {
    activate: activateSp,
    attachLogo: attachServiceProviderLogo,
    create: createSp,
    deactivate: deactivateSp,
    get: getSp,
    getLogoUrl: getServiceProviderLogoUrl,
    issueLogoUploadUrl: issueServiceProviderLogoUploadUrl,
    list: listSps,
    listAssignedTenants,
    listUsers: listSpUsers,
    removeLogo: removeServiceProviderLogo,
    update: updateSp,
    uploadLogo: uploadServiceProviderLogo,
  };

  readonly organizations = {
    attachLogo: attachOrganizationLogo,
    create: createOrganization,
    get: getOrganization,
    getLogoUrl: getOrganizationLogoUrl,
    issueLogoUploadUrl: issueOrganizationLogoUploadUrl,
    list: listOrganizations,
    removeLogo: removeOrganizationLogo,
    update: updateOrganization,
    uploadLogo: uploadOrganizationLogo,
  };

  readonly users = {
    assignRole,
    assignToServiceProvider,
    create: createUser,
    delete: deleteUser,
    get: getUser,
    list: listUsers,
    update: updateUser,
  };
}
