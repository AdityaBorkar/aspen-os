import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { type BetterAuthOptions, betterAuth } from "better-auth";
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

import type { DatabaseUnit } from "../db";
import type { Unit } from "../index";
import type { PubSubUnit } from "../pubsub";
import * as db_schema from "./db-schema";
import { assignRole, deleteRole, listRoles, unassignRole } from "./services/role";
import { authenticate, invalidateSession, validateSession } from "./services/session";
import { createUser, deleteUser, getUser, updateUser } from "./services/user";

export type { AclDeclaration } from "./utils/acl";
export { defineAcl } from "./utils/acl";
export { toSession, toUser } from "./utils/mappers";

type DrizzleDB = NodePgDatabase<Record<string, never>>;
export type AuthService = ReturnType<typeof createBetterAuthService>;
export interface AuthServiceDeps {
  auth: AuthService;
  db: DrizzleDB;
  pubsub: PubSubUnit | null;
}
export type Session = AuthService["$Infer"]["Session"]["session"];
export type User = AuthService["$Infer"]["Session"]["user"];

export interface AuthConfig extends BetterAuthOptions {}

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
  #config: AuthConfig;
  #db: DrizzleDB;
  #pubsub: PubSubUnit;
  #betterAuth: AuthService;

  constructor(
    config: AuthConfig,
    // Biome-ignore lint/suspicious/noExplicitAny: drizzle NodePgDatabase invariance forces any here
    units: { db: DatabaseUnit<any>; pubsub: PubSubUnit },
  ) {
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
    // TODO: WORK ON THIS LOGIC
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
        list: () => listRoles(deps),
        remove: (input: Parameters<typeof deleteRole>[0]) => deleteRole(input, deps),
      },
      session: {
        create: (input: Parameters<typeof authenticate>[0]) => authenticate(input, deps),
        invalidate: (input: Parameters<typeof invalidateSession>[0]) =>
          invalidateSession(input, deps),
        validate: (input: Parameters<typeof validateSession>[0]) => validateSession(input, deps),
      },
      user: {
        create: (input: Parameters<typeof createUser>[0]) => createUser(input, deps),
        get: (query: Parameters<typeof getUser>[0]) => getUser(query, deps),
        remove: (input: Parameters<typeof deleteUser>[0]) => deleteUser(input, deps),
        role: {
          assign: (input: Parameters<typeof assignRole>[0]) => assignRole(input, deps),
          unassign: (input: Parameters<typeof unassignRole>[0]) => unassignRole(input, deps),
        },
        update: (input: Parameters<typeof updateUser>[0]) => updateUser(input, deps),
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
