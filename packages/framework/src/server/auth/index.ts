import { type Auth, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, captcha, phoneNumber, username } from "better-auth/plugins";

import type { DatabaseUnit } from "../db";
import type { LogUnit } from "../log";
import type { PubSubUnit } from "../pubsub";
import * as db_schema from "./db-schema";
import {
  assignRole,
  deleteRole,
  getAllRoles,
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
  getUserByEmail,
  getUserById,
  updateUser,
} from "./services/user";
import type { AuthConfig } from "./types";

export type { AuthEventMap } from "./event-map";
export type {
  AuthConfig,
  RoleData,
  Session,
  User,
} from "./types";

import { passkey } from "@better-auth/passkey";
import { lastLoginMethod, twoFactor } from "better-auth/plugins";

export class AuthUnit {
  readonly $name = "auth";
  readonly $db_schema = db_schema;
  readonly auth: Auth;

  constructor(
    config: AuthConfig,
    units: { db: DatabaseUnit; log: LogUnit; pubsub: PubSubUnit },
  ) {
    const { cfSecretKey, access_control, roles, ...rest } = config;
    this.auth = betterAuth({
      ...rest,
      database: drizzleAdapter(units.db.db, {
        camelCase: false,
        provider: "pg",
        schema: db_schema,
        transaction: true,
        usePlural: false,
      }),
      emailAndPassword: { enabled: true },
      plugins: [
        admin({ ac: access_control, roles }),
        username(),
        phoneNumber(),
        lastLoginMethod(),
        twoFactor(),
        passkey(),
        captcha({
          provider: "cloudflare-turnstile",
          secretKey: cfSecretKey,
        }),
      ],
    });
  }

  async $prepare() {
    return;
  }

  async $destroy() {
    return;
  }

  async fetch_handler(request: Request) {
    return this.auth.handler(request);
  }

  get role() {
    return {
      delete: deleteRole,
      list: getAllRoles,
    };
  }

  get session() {
    return {
      create: authenticate,
      invalidate: invalidateSession,
      validate: validateSession,
    };
  }

  get user() {
    return {
      create: createUser,
      delete: deleteUser,
      get(query: { id: string } | { email: string }) {
        if ("id" in query) return getUserById({ id: query.id });
        return getUserByEmail({ email: query.email });
      },
      role: {
        assign: assignRole,
        unassign: unassignRole,
      },
      update: updateUser,
    };
  }
}
