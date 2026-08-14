import type {
  AuthUnit,
  DatabaseUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
} from "@aspen-os/platform/server";

import { acl } from "./auth";
import { control_plane_schemas, tenant_schemas } from "./db-schemas";
import { events } from "./pubsub";
import { activateSp } from "./workflows/sp.activate";
import { getAssignedTenants } from "./workflows/sp.assigned-tenants";
import { createSp } from "./workflows/sp.create";
import { deactivateSp } from "./workflows/sp.deactivate";
import { getSp } from "./workflows/sp.get";
import { listSps } from "./workflows/sp.list";
import { updateSp } from "./workflows/sp.update";
import { getUsers } from "./workflows/sp.users";
import { activateTenant } from "./workflows/tenant.activate";
import { assignServiceProvider } from "./workflows/tenant.assign-sp";
import { churnTenant } from "./workflows/tenant.churn";
import { getTenant } from "./workflows/tenant.get";
import { listTenants } from "./workflows/tenant.list";
import { createOnboardTenant } from "./workflows/tenant.onboard";
import { reactivateTenant } from "./workflows/tenant.reactivate";
import { suspendTenant } from "./workflows/tenant.suspend";
import { unassignServiceProvider } from "./workflows/tenant.unassign-sp";
import { updateTenant } from "./workflows/tenant.update";
import { assignRole } from "./workflows/user.assign-role";
import { assignToServiceProvider } from "./workflows/user.assign-sp";
import { createUser } from "./workflows/user.create";
import { deleteUser } from "./workflows/user.delete";
import { getUser } from "./workflows/user.get";
import { listUsers } from "./workflows/user.list";
import { updateUser } from "./workflows/user.update";

export type ManagementPlaneConfig = undefined;

export class ManagementPlane implements Module {
  static create(config: ManagementPlaneConfig): ManagementPlane {
    return new ManagementPlane(config);
  }

  readonly $name = "management";
  readonly $dependencies = ["organization"];
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

  get tenants() {
    if (!this.#db) {
      throw new Error("ManagementPlane not initialized");
    }
    return {
      activate: activateTenant,
      assignServiceProvider,
      churn: churnTenant,
      get: getTenant,
      list: listTenants,
      onboard: createOnboardTenant(this.#db),
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
    getAssignedTenants,
    getUsers,
    list: listSps,
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
