import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { type Auth, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  admin,
  captcha,
  emailOTP,
  lastLoginMethod,
  organization,
  phoneNumber,
  twoFactor,
  username,
} from "better-auth/plugins";

import type { DatabaseUnit } from "../db";
import type { PubSubUnit } from "../pubsub";
import * as db_schema from "./db-schema";
import { createRoleServices } from "./services/role";
import { createSessionServices } from "./services/session";
import { createUserServices } from "./services/user";
import type { AuthConfig, AuthServiceDeps } from "./types";

export type { AuthEventMap } from "./event-map";
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

  constructor(config: AuthConfig, units: { db: DatabaseUnit }) {
    const { cfSecretKey, access_control, roles, ...rest } = config;
    const auth = betterAuth({
      ...rest,
      database: drizzleAdapter(units.db.controlPlaneDb, {
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
        organization(),
        phoneNumber(),
        emailOTP({
          async sendVerificationOTP({ email, otp, type }) {
            console.log({ email, otp, type });
            if (type === "sign-in") {
              // Send the OTP for sign in
            } else if (type === "email-verification") {
              // Send the OTP for email verification
            } else {
              // Send the OTP for password reset
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
        ...(cfSecretKey
          ? [
              captcha({
                provider: "cloudflare-turnstile",
                secretKey: cfSecretKey,
              }),
            ]
          : []),
      ],
    });
    this.auth = auth as unknown as Auth;

    this.deps = {
      auth: this.auth,
      db: units.db.controlPlaneDb,
      pubsub: undefined as unknown as PubSubUnit,
    };
  }

  setPubSub(pubsub: PubSubUnit): void {
    this.deps.pubsub = pubsub;
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

  get api() {
    return this.auth.api;
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
