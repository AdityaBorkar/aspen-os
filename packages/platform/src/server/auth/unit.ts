import type { DatabaseUnit } from "#/server/db";
import * as db_schema from "#/server/db/schema/auth.gen.js";
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
import type { AuthConfig, AuthService, AuthServiceDeps, RoleData, Session, User } from "./types";
import { createUser, deleteUser, getUser, updateUser } from "./user-service";

export type { AclDeclaration } from "./utils";
export { defineAcl } from "./utils";
export { toSession, toUser } from "./utils";
export type { AuthConfig, AuthService, AuthServiceDeps, RoleData, Session, User } from "./types";

/** Stable programmatic surface over the auth services. Built once per service instance. */
export interface AuthRestApi {
  otp: {
    get: (tokenRef: string) => Promise<{ email: string; otp: string; type: string } | null>;
  };
  role: {
    list: () => Promise<RoleData[]>;
    remove: (input: { name: string }) => Promise<void>;
  };
  session: {
    create: (input: {
      email: string;
      password: string;
    }) => Promise<{ session: Session; user: User }>;
    invalidate: (input: { sessionId: string }) => Promise<void>;
    validate: (input: { token: string }) => Promise<{ session: Session; user: User } | null>;
  };
  user: {
    create: (input: { email: string; name?: string; password: string }) => Promise<User>;
    get: (query: { id: string } | { email: string }) => Promise<User | null>;
    remove: (input: { id: string }) => Promise<void>;
    role: {
      assign: (input: { roleName: string; userId: string }) => Promise<void>;
      unassign: (input: { userId: string }) => Promise<void>;
    };
    update: (input: {
      id: string;
      data: Partial<Pick<User, "image" | "name" | "role">>;
    }) => Promise<User>;
  };
}

type DrizzleDB = PostgresJsDatabase;

export class AuthUnit implements Unit {
  readonly $name = "auth" as const;
  readonly $db_schema = db_schema;
  readonly #config: AuthConfig;
  readonly #db: DrizzleDB;
  readonly #pubsub: PubSubUnit;
  #betterAuth: AuthService;
  #rest: AuthRestApi;

  constructor(config: AuthConfig, units: { db: DatabaseUnit<any>; pubsub: PubSubUnit }) {
    this.#config = config;
    this.#db = units.db.controlPlaneDb;
    this.#pubsub = units.pubsub;
    this.#betterAuth = createBetterAuthService(config, units.db.controlPlaneDb, {
      pubsub: units.pubsub,
    });
    this.#rest = this.buildRest();
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
    this.#rest = this.buildRest();
  }

  get rest(): AuthRestApi {
    return this.#rest;
  }

  private buildRest(): AuthRestApi {
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
        remove: async (input: { name: string }) => deleteRole(input, deps),
      },
      session: {
        create: async (input: { email: string; password: string }) => authenticate(input, deps),
        invalidate: async (input: { sessionId: string }) => invalidateSession(input, deps),
        validate: async (input: { token: string }) => validateSession(input, deps),
      },
      user: {
        create: async (input: { email: string; name?: string; password: string }) =>
          createUser(input, deps),
        get: async (query: { id: string } | { email: string }) => getUser(query, deps),
        remove: async (input: { id: string }) => deleteUser(input, deps),
        role: {
          assign: async (input: { roleName: string; userId: string }) => assignRole(input, deps),
          unassign: async (input: { userId: string }) => unassignRole(input, deps),
        },
        update: async (input: {
          id: string;
          data: Partial<Pick<User, "image" | "name" | "role">>;
        }) => updateUser(input, deps),
      },
    };
  }
}

export type BetterAuthInstance = ReturnType<typeof betterAuth>;
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
          await pubsub?.publish("auth.email_otp_requested", { email, tokenRef, type });
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
