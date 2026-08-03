import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
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

import type { DatabaseUnit } from "../db";
import type { Unit } from "../index";
import type { PubSubUnit } from "../pubsub";
import * as db_schema from "./db-schema";
import type { AdminAuth, AuthConfig } from "./types";

export type { AclDeclaration } from "./acl";
export { defineAcl } from "./acl";
export type { AuthEventMap } from "./event-map";
export { toSession, toUser } from "./mappers";
export type {
  AdminAuth,
  AdminAuthApi,
  AuthConfig,
  AuthServiceDeps,
  RoleData,
  Session,
  User,
} from "./types";

export class AuthUnit implements Unit {
  readonly $name = "auth" as const;
  readonly $db_schema = db_schema;
  readonly service: AdminAuth;

  private readonly config: AuthConfig;
  private readonly pubsub: PubSubUnit;
  private readonly db: DatabaseUnit["db"];

  constructor(
    config: AuthConfig,
    units: { db: DatabaseUnit; pubsub: PubSubUnit },
  ) {
    this.config = config;
    this.db = units.db.controlPlaneDb;
    this.pubsub = units.pubsub;

    const accessControl = {};

    this.service = betterAuth({
      baseURL: config.baseURL,
      database: drizzleAdapter(this.db, {
        camelCase: false,
        provider: "pg",
        schema: db_schema,
        transaction: true,
        usePlural: false,
      }),
      emailAndPassword: { enabled: true },
      plugins: [
        admin({ ac: accessControl }),
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
        // captcha({
        //   provider: "cloudflare-turnstile",
        //   secretKey: config.cfSecretKey,
        // }),
      ],
      secret: config.secret,
      session: config.session,
      socialProviders: config.socialProviders,
    });
  }

  async $prepareInfra() {}

  async $cleanup() {}

  async fetchHandler(request: Request): Promise<Response> {
    return this.service.handler(request);
  }

  // get user() {
  //   return {
  //     create: this.userServices.create,
  //     delete: this.userServices.delete,
  //     get: this.userServices.get,
  //     role: {
  //       assign: this.roleServices.assign,
  //       unassign: this.roleServices.unassign,
  //     },
  //     update: this.userServices.update,
  //   };
  // }

  // get session() {
  //   return {
  //     create: this.sessionServices.authenticate,
  //     invalidate: this.sessionServices.invalidate,
  //     validate: this.sessionServices.validate,
  //   };
  // }

  // get role() {
  //   return {
  //     delete: this.roleServices.remove,
  //     list: this.roleServices.list,
  //   };
  // }

  // get admin() {
  //   const api = this.$auth.api;
  //   return {
  //     createOrganization: api.createOrganization,
  //     createUser: api.createUser,
  //     deleteOrganization: api.deleteOrganization,
  //   };
  // }
}
