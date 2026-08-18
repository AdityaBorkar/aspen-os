import type { DatabaseUnit } from "#/server/db";
import * as db_schema from "#/server/db/schema/auth";
import type { PubSubUnit } from "#/server/pubsub";
import type { Unit } from "#/server/types";

import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
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
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getOtp, storeOtp } from "./otp-service";
import { assignRole, deleteRole, listRoles, unassignRole } from "./role-service";
import { authenticate, invalidateSession, validateSession } from "./session-service";
import type { AuthConfig, AuthService, AuthServiceDeps } from "./types";
import { createUser, deleteUser, getUser, updateUser } from "./user-service";

export type { AclDeclaration } from "./utils";
export { defineAcl } from "./utils";
export { toSession, toUser } from "./utils";
export type { AuthConfig, AuthService, AuthServiceDeps, RoleData, Session, User } from "./types";

type DrizzleDB = PostgresJsDatabase;

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
    this.#betterAuth = createBetterAuthService(config, units.db.controlPlaneDb, {
      pubsub: units.pubsub,
    });
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
    this.#betterAuth = createBetterAuthService(this.#config, this.#db, {
      ac,
      pubsub: this.#pubsub,
    });
  }

  get rest() {
    const deps: AuthServiceDeps = {
      auth: this.#betterAuth,
      db: this.#db,
      pubsub: this.#pubsub,
    };
    return {
      otp: {
        get: async (tokenRef: string) => getOtp(tokenRef),
      },
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
  options?: { ac?: ReturnType<typeof createAccessControl>; pubsub?: PubSubUnit | null },
) {
  const ac = options?.ac;
  const pubsub = options?.pubsub;
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
          const tokenRef = storeOtp({ email, otp, type });
          await pubsub?.publish("auth:email_otp_requested", {
            email,
            tokenRef,
            type,
          });
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
