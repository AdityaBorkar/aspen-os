import type { Auth } from "better-auth";
import { createAccessControl } from "better-auth/plugins";

import type { DatabaseUnit } from "../db";
import type { PubSubUnit } from "../pubsub";
import { buildAuthConfig } from "./config-builder";
import * as db_schema from "./db-schema";
import { createRoleServices } from "./services/role";
import { createSessionServices } from "./services/session";
import { createUserServices } from "./services/user";
import type { AuthConfig, AuthServiceDeps } from "./types";

type AuthApi = Auth["api"];

type AdminAuthApi = AuthApi & {
  createOrganization: (input: unknown) => Promise<{ id: string }>;
  createUser: (input: {
    body: {
      email: string;
      name: string;
      password: string;
      role: string;
    };
  }) => Promise<{ user: { id: string; email: string; role?: string } }>;
  deleteOrganization: (input: unknown) => Promise<void>;
};

export type { AclDeclaration } from "./acl";
export { defineAcl } from "./acl";
export type { AuthEventMap } from "./event-map";
export { toSession, toUser } from "./mappers";
export type {
  AuthConfig,
  AuthServiceDeps,
  RoleData,
  Session,
  User,
} from "./types";

export class AuthUnit {
  readonly $name = "auth";
  readonly $db_schema = db_schema;
  readonly auth: Auth;

  private readonly deps: AuthServiceDeps;
  private readonly config: AuthConfig;
  private readonly dbUnit: DatabaseUnit;
  private _userServices: ReturnType<typeof createUserServices> | null = null;
  private _sessionServices: ReturnType<typeof createSessionServices> | null =
    null;
  private _roleServices: ReturnType<typeof createRoleServices> | null = null;

  constructor(config: AuthConfig, units: { db: DatabaseUnit }) {
    this.config = config;
    this.dbUnit = units.db;

    const auth = buildAuthConfig(config, units.db);
    this.auth = auth;

    this.deps = {
      auth: this.auth,
      db: units.db.controlPlaneDb,
      pubsub: null,
    };
  }

  setPubSub(pubsub: PubSubUnit): void {
    this.deps.pubsub = pubsub;
  }

  async $prepareInfra() {
    return;
  }

  applyModuleAcl(acl: Record<string, readonly string[]>): void {
    const access_control = createAccessControl(acl);
    const auth = buildAuthConfig(this.config, this.dbUnit, access_control);

    (this as { auth: Auth }).auth = auth;
    this.deps.auth = this.auth;
  }

  async $cleanup() {
    return;
  }

  async fetch_handler(request: Request) {
    return this.auth.handler(request);
  }

  get api() {
    return this.auth.api;
  }

  async createOrganization(input: {
    body: { logo?: string; name: string; slug: string; userId: string };
  }): Promise<{ id: string }> {
    const api = this.auth.api as AdminAuthApi;
    return api.createOrganization(input);
  }

  async deleteOrganization(input: {
    body: { organizationId: string };
  }): Promise<void> {
    const api = this.auth.api as AdminAuthApi;
    await api.deleteOrganization(input);
  }

  async createUser(input: {
    body: {
      email: string;
      name: string;
      password: string;
      role: string;
    };
  }): Promise<{ user: { id: string; email: string; role?: string } }> {
    const api = this.auth.api as AdminAuthApi;
    return api.createUser(input);
  }

  private get userServices() {
    if (!this._userServices) this._userServices = createUserServices(this.deps);
    return this._userServices;
  }

  private get sessionServices() {
    if (!this._sessionServices)
      this._sessionServices = createSessionServices(this.deps);
    return this._sessionServices;
  }

  private get roleServices() {
    if (!this._roleServices) this._roleServices = createRoleServices(this.deps);
    return this._roleServices;
  }

  get role() {
    return {
      delete: this.roleServices.remove,
      list: this.roleServices.list,
    };
  }

  get session() {
    return {
      create: this.sessionServices.authenticate,
      invalidate: this.sessionServices.invalidate,
      validate: this.sessionServices.validate,
    };
  }

  get user() {
    return {
      create: this.userServices.create,
      delete: this.userServices.delete,
      get: this.userServices.get,
      role: {
        assign: this.roleServices.assign,
        unassign: this.roleServices.unassign,
      },
      update: this.userServices.update,
    };
  }
}
