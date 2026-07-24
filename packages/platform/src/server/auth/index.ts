import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { type Auth, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  admin,
  captcha,
  createAccessControl,
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

export type { AclDeclaration } from "./acl";
export { defineAcl } from "./acl";
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
  private readonly config: AuthConfig;
  private readonly dbUnit: DatabaseUnit;

  constructor(config: AuthConfig, units: { db: DatabaseUnit }) {
    this.config = config;
    this.dbUnit = units.db;

    // Create auth without admin plugin initially
    // The admin plugin will be added when applyModuleAcl is called
    const auth = betterAuth({
      baseURL: config.baseURL,
      database: drizzleAdapter(units.db.controlPlaneDb, {
        camelCase: false,
        provider: "pg",
        schema: db_schema,
        transaction: true,
        usePlural: false,
      }),
      emailAndPassword: { enabled: true },
      plugins: [
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
        ...(config.cfSecretKey
          ? [
              captcha({
                provider: "cloudflare-turnstile",
                secretKey: config.cfSecretKey,
              }),
            ]
          : []),
      ],
      secret: config.secret,
      session: config.session,
      socialProviders: config.socialProviders,
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

  async $prepareInfra() {
    return;
  }

  /**
   * Apply module ACL declarations to the auth unit.
   * This creates the access control from merged module ACL.
   *
   * Called by the platform during prepareInfra().
   */
  applyModuleAcl(acl: Record<string, readonly string[]>): void {
    // Create access control from merged module ACL
    const access_control = createAccessControl(acl);

    // Re-create auth with admin plugin using the module-derived access control
    const auth = betterAuth({
      baseURL: this.config.baseURL,
      database: drizzleAdapter(this.dbUnit.controlPlaneDb, {
        camelCase: false,
        provider: "pg",
        schema: db_schema,
        transaction: true,
        usePlural: false,
      }),
      emailAndPassword: { enabled: true },
      plugins: [
        admin({ ac: access_control }),
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
        ...(this.config.cfSecretKey
          ? [
              captcha({
                provider: "cloudflare-turnstile",
                secretKey: this.config.cfSecretKey,
              }),
            ]
          : []),
      ],
      secret: this.config.secret,
      session: this.config.session,
      socialProviders: this.config.socialProviders,
    });

    // Update the auth instance and deps
    (this as { auth: Auth }).auth = auth as unknown as Auth;
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
