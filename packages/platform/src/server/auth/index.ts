import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  admin,
  emailOTP,
  lastLoginMethod,
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
import {
  assignRole,
  deleteRole,
  listRoles,
  unassignRole,
} from "./services/role";
import {
  authenticate,
  invalidateSession,
  validateSession,
} from "./services/session";
import {
  createUser,
  deleteUser,
  getUser,
  getUserByEmail,
  getUserById,
  updateUser,
} from "./services/user";

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
  #db: DrizzleDB;
  #pubsub: PubSubUnit;

  constructor(
    config: AuthConfig,
    units: { db: DatabaseUnit; pubsub: PubSubUnit },
  ) {
    this.#db = units.db.controlPlaneDb;
    this.#pubsub = units.pubsub;
    this.betterAuth = createBetterAuthService(config, units.db.controlPlaneDb);
  }

  async $prepareInfra() {}

  async $cleanup() {}

  readonly betterAuth: AuthService;

  async fetchHandler(request: Request): Promise<Response> {
    return this.betterAuth.handler(request);
  }

  get _() {
    const deps: AuthServiceDeps = {
      auth: this.betterAuth,
      db: this.#db,
      pubsub: this.#pubsub,
    };

    return {
      assignRole: (input: { roleName: string; userId: string }) =>
        assignRole(input, deps),
      authenticate: (input: { email: string; password: string }) =>
        authenticate(input, deps),
      createUser: (input: { email: string; name?: string; password: string }) =>
        createUser(input, deps),
      deleteRole: (input: { name: string }) => deleteRole(input, deps),
      deleteUser: (input: { id: string }) => deleteUser(input, deps),
      getUser: (query: { id: string } | { email: string }) =>
        getUser(query, deps),
      getUserByEmail: (input: { email: string }) => getUserByEmail(input, deps),
      getUserById: (input: { id: string }) => getUserById(input, deps),
      invalidateSession: (input: { sessionId: string }) =>
        invalidateSession(input, deps),
      listRoles: () => listRoles(deps),
      unassignRole: (input: { userId: string }) => unassignRole(input, deps),
      updateUser: (input: {
        id: string;
        data: Partial<Pick<User, "image" | "name" | "role">>;
      }) => updateUser(input, deps),
      validateSession: (input: { token: string }) =>
        validateSession(input, deps),
    };
  }
}

export function createBetterAuthService(config: AuthConfig, db: DrizzleDB) {
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
      admin(),
      username(),
      organization(),
      phoneNumber(),
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          console.log({ email, otp, type });
          if (type === "sign-in") {
          } else if (type === "email-verification") {
          } else {
          }
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
      lastLoginMethod(),
      twoFactor(),
      passkey(),
    ],
  });
}
