import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { type Auth, type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  admin,
  captcha,
  type createAccessControl,
  emailOTP,
  lastLoginMethod,
  organization,
  phoneNumber,
  twoFactor,
  username,
} from "better-auth/plugins";

import type { DatabaseUnit } from "../db";
import * as db_schema from "./db-schema";
import type { AuthConfig } from "./types";

type AccessControl = ReturnType<typeof createAccessControl>;

function buildPlugins(
  config: AuthConfig,
  accessControl?: AccessControl,
): BetterAuthOptions["plugins"] {
  const plugins: NonNullable<BetterAuthOptions["plugins"]> = [
    ...(accessControl ? [admin({ ac: accessControl })] : []),
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
  ];
  if (config.cfSecretKey) {
    plugins.push(
      captcha({
        provider: "cloudflare-turnstile",
        secretKey: config.cfSecretKey,
      }),
    );
  }
  return plugins;
}

export function buildAuthConfig(
  config: AuthConfig,
  dbUnit: DatabaseUnit,
  accessControl?: AccessControl,
): Auth {
  return betterAuth({
    baseURL: config.baseURL,
    database: drizzleAdapter(dbUnit.controlPlaneDb, {
      camelCase: false,
      provider: "pg",
      schema: db_schema,
      transaction: true,
      usePlural: false,
    }),
    emailAndPassword: { enabled: true },
    plugins: buildPlugins(config, accessControl),
    secret: config.secret,
    session: config.session,
    socialProviders: config.socialProviders,
  }) as Auth;
}
