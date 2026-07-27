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

  constructor(config: AuthConfig, units: { db: DatabaseUnit }) {
    this.config = config;
    this.dbUnit = units.db;

    const auth = buildAuthConfig(config, units.db) as unknown as Auth;
    this.auth = auth;

    this.deps = {
      auth: this.auth,
      db: units.db.controlPlaneDb,
      pubsub: undefined as unknown as PubSubUnit,
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
    const auth = buildAuthConfig(
      this.config,
      this.dbUnit,
      access_control,
    ) as unknown as Auth;

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
    const api = this.auth.api as unknown as {
      createOrganization: (input: unknown) => Promise<{ id: string }>;
    };
    return api.createOrganization(input);
  }

  async deleteOrganization(input: {
    body: { organizationId: string };
  }): Promise<void> {
    const api = this.auth.api as unknown as {
      deleteOrganization: (input: unknown) => Promise<void>;
    };
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
    const api = this.auth.api as unknown as {
      createUser: (input: unknown) => Promise<{
        user: { id: string; email: string; role?: string };
      }>;
    };
    return api.createUser(input);
  }

  get role() {
    const services = createRoleServices(this.deps);
    return {
      delete: services.remove,
      list: services.list,
    };
  }

  get session() {
    const services = createSessionServices(this.deps);
    return {
      create: services.authenticate,
      invalidate: services.invalidate,
      validate: services.validate,
    };
  }

  get user() {
    const userServices = createUserServices(this.deps);
    const roleServices = createRoleServices(this.deps);
    return {
      create: userServices.create,
      delete: userServices.delete,
      get: userServices.get,
      role: {
        assign: roleServices.assign,
        unassign: roleServices.unassign,
      },
      update: userServices.update,
    };
  }
}
