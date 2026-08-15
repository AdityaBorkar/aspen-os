import type { Unit } from "#/server";
import * as db_schema from "#/server/auth/db-schema";
import { assignRole, deleteRole, listRoles, unassignRole } from "#/server/auth/services/role";
import { authenticate, invalidateSession, validateSession } from "#/server/auth/services/session";
import { createUser, deleteUser, getUser, updateUser } from "#/server/auth/services/user";
import type { DatabaseUnit } from "#/server/db";
import type { PubSubUnit } from "#/server/pubsub";

import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  admin,
  createAccessControl,
  emailOTP,
  organization,
  phoneNumber,
  twoFactor,
  username,
} from "better-auth/plugins";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export type { AclDeclaration } from "#/server/auth/utils/acl";
export { defineAcl } from "#/server/auth/utils/acl";
export { toSession, toUser } from "#/server/auth/utils/mappers";

type DrizzleDB = NodePgDatabase;
export type AuthService = ReturnType<typeof createBetterAuthService>;
export interface AuthServiceDeps {
  auth: AuthService;
  db: DrizzleDB;
  pubsub: PubSubUnit | null;
}
export type Session = AuthService["$Infer"]["Session"]["session"];
export type User = AuthService["$Infer"]["Session"]["user"];

export type AuthConfig = BetterAuthOptions;

export interface RoleData {
  createdAt: Date;
  description?: string;
  id: string;
  name: string;
  permissions: [];
  updatedAt: Date;
}

export class AuthUnit implements Unit {
  readonly $name = "auth" as const;
  readonly $db_schema = db_schema;
  readonly #config: AuthConfig;
  readonly #db: DrizzleDB;
  readonly #pubsub: PubSubUnit;
  #betterAuth: AuthService;

  constructor(config: AuthConfig, units: { db: DatabaseUnit<any>; pubsub: PubSubUnit }) {
    this.#config = config;
    this.#db = units.db.controlPlaneDb;
    this.#pubsub = units.pubsub;
    this.#betterAuth = createBetterAuthService(config, units.db.controlPlaneDb);
  }

  async $prepareInfra(acl: Record<string, readonly string[]> = {}) {
    this.applyModuleAcl(acl);
  }

  async $cleanup() {}

  get service(): AuthService {
    return this.#betterAuth;
  }

  async fetchHandler(request: Request): Promise<Response> {
    return this.#betterAuth.handler(request);
  }

  applyModuleAcl(acl: Record<string, readonly string[]>): void {
    const ac = createAccessControl(acl);
    this.#betterAuth = createBetterAuthService(this.#config, this.#db, ac);
  }

  get rest() {
    const deps: AuthServiceDeps = {
      auth: this.#betterAuth,
      db: this.#db,
      pubsub: this.#pubsub,
    };
    return {
      role: {
        list: async () => listRoles(deps),
        remove: async (input: Parameters<typeof deleteRole>[0]) => deleteRole(input, deps),
      },
      session: {
        create: async (input: Parameters<typeof authenticate>[0]) => authenticate(input, deps),
        invalidate: async (input: Parameters<typeof invalidateSession>[0]) =>
          invalidateSession(input, deps),
        validate: async (input: Parameters<typeof validateSession>[0]) =>
          validateSession(input, deps),
      },
      user: {
        create: async (input: Parameters<typeof createUser>[0]) => createUser(input, deps),
        get: async (query: Parameters<typeof getUser>[0]) => getUser(query, deps),
        remove: async (input: Parameters<typeof deleteUser>[0]) => deleteUser(input, deps),
        role: {
          assign: async (input: Parameters<typeof assignRole>[0]) => assignRole(input, deps),
          unassign: async (input: Parameters<typeof unassignRole>[0]) => unassignRole(input, deps),
        },
        update: async (input: Parameters<typeof updateUser>[0]) => updateUser(input, deps),
      },
    };
  }
}

export function createBetterAuthService(
  config: AuthConfig,
  db: DrizzleDB,
  ac?: ReturnType<typeof createAccessControl>,
) {
  return betterAuth({
    ...config,
    database: drizzleAdapter(db, {
      camelCase: false,
      provider: "pg",
      schema: db_schema,
      transaction: true,
      usePlural: false,
    }),
    emailAndPassword: { enabled: true },
    plugins: [
      admin(ac ? { ac } : {}),
      username(),
      organization(),
      phoneNumber(),
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          console.log({ email, otp, type });
        },
      }),
      apiKey({
        enableSessionForAPIKeys: false,
        rateLimit: {
          enabled: true,
          maxRequests: 10,
          timeWindow: 1000 * 60 * 60 * 24,
        },
      }),
      // LastLoginMethod(),
      twoFactor(),
      passkey(),
    ],
  });
}
