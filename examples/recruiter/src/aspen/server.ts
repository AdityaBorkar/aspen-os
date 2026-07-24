import { Organization } from "@aspen-os/organization";
import type { SingleTenantConfig } from "@aspen-os/platform/server";
import { SingleTenantPlatform } from "@aspen-os/platform/server";

import { env } from "../env";

const BASE_URL = `${env.PUBLIC_WEB_SSL ? "https" : "http"}://${env.PUBLIC_WEB_DOMAIN}:${env.PUBLIC_WEB_PORT}`;

const auth = {
  baseURL: BASE_URL,
  secret: env.AUTH_SECRET,
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
} satisfies SingleTenantConfig["auth"];

const db = {
  database: env.DB_NAME,
  host: env.DB_HOST,
  password: env.DB_PASSWORD,
  port: env.DB_PORT,
  ssl: env.DB_SSL,
  user: env.DB_USER,
} satisfies SingleTenantConfig["db"];

const kvStore = {} satisfies SingleTenantConfig["kvStore"];

const logs = {} satisfies SingleTenantConfig["logs"];

const pubsub = {} satisfies SingleTenantConfig["pubsub"];

const rpc = {} satisfies SingleTenantConfig["rpc"];

const storage = {
  bucket: env.STORAGE_BUCKET,
  provider: {
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY,
      secretAccessKey: env.STORAGE_SECRET_KEY,
    },
    endpoint: env.STORAGE_ENDPOINT,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    region: env.STORAGE_REGION,
    type: "s3",
  },
} satisfies SingleTenantConfig["storage"];

const organization = Organization.create({
  country: "INDIA",
});

export const p = SingleTenantPlatform.create(
  { auth, db, kvStore, logs, pubsub, rpc, storage },
  [organization],
);
