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
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { DatabaseUnit } from "../db";
import type { Unit } from "../index";
import type { PubSubUnit } from "../pubsub";
import * as db_schema from "./db-schema";

export type { AclDeclaration } from "./acl";
export { defineAcl } from "./acl";
export type { AuthEventMap } from "./event-map";
export { toSession, toUser } from "./mappers";

type DrizzleDB = NodePgDatabase<Record<string, never>>;
export type AuthService = ReturnType<typeof createAuthService>;
export interface AuthServiceDeps {
  auth: AuthService;
  db: DrizzleDB;
  pubsub: PubSubUnit | null;
}

export interface AuthConfig {
  baseURL: string;
  cfSecretKey?: string;
  secret: string;
  session: {
    expiresIn?: number;
    updateAge?: number;
    disableSessionRefresh?: boolean;
    deferSessionRefresh?: boolean;
    storeSessionInDatabase?: boolean;
    preserveSessionInDatabase?: boolean;
    freshAge?: number;
    cookieCache?: {
      maxAge?: number;
      enabled?: boolean;
      strategy?: "compact" | "jwt" | "jwe";
      refreshCache?:
        | boolean
        | {
            updateAge?: number;
          };
      version?: string;
    };
  };
  socialProviders?: {
    google?: {
      clientId: string;
      clientSecret: string;
      scope?: string[];
      disableDefaultScope?: boolean;
      redirectURI?: string;
      enabled?: boolean;
    };
  };
}

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

  constructor(
    config: AuthConfig,
    units: { db: DatabaseUnit; pubsub: PubSubUnit },
  ) {
    this.service = createAuthService(config, units.db.controlPlaneDb);
  }

  async $prepareInfra() {}

  async $cleanup() {}

  readonly service: AuthService;

  async fetchHandler(request: Request): Promise<Response> {
    return this.service.handler(request);
  }

  get _() {
    return {};
  }
}

export function createAuthService(config: AuthConfig, db: DrizzleDB) {
  return betterAuth({
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
    ...config,
  });
}
