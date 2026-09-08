import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { activateSp } from "#/workflows/sp/activate";
import { listAssignedTenants } from "#/workflows/sp/assigned-tenant/list";
import { createSp } from "#/workflows/sp/create";
import { deactivateSp } from "#/workflows/sp/deactivate";
import { getSp } from "#/workflows/sp/get";
import { listSps } from "#/workflows/sp/list";
import { updateSp } from "#/workflows/sp/update";
import { listSpUsers } from "#/workflows/sp/user/list";
import { activateTenant } from "#/workflows/tenant/activate";
import { churnTenant } from "#/workflows/tenant/churn";
import { getTenant } from "#/workflows/tenant/get";
import { listTenants } from "#/workflows/tenant/list";
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
  AuthUnit,
  DatabaseUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
} from "@aspen-os/platform/server";

export type ManagementPlaneConfig = undefined;

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

  $initialize(units: { db: DatabaseUnit; auth: AuthUnit; pubsub: PubSubUnit }): void {
    this.#db = units.db;
  }

  $prepareRuntime() {}

  $cleanup() {}

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
      churn: churnTenant,
      get: getTenant,
      list: listTenants,
      onboard: createOnboardTenant(this.#requireDb()),
      reactivate: reactivateTenant,
      suspend: suspendTenant,
      unassignServiceProvider,
      update: updateTenant,
    };
  }

  readonly serviceProviders = {
    activate: activateSp,
    create: createSp,
    deactivate: deactivateSp,
    get: getSp,
    list: listSps,
    listAssignedTenants,
    listUsers: listSpUsers,
    update: updateSp,
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
