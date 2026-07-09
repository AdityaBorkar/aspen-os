import { Framework } from "@aspen-os/framework/server";
import { createOrganizationModule } from "@aspen-os/organization";

import { env } from "../env";
import { access_control, roles } from "./auth";

const BASE_URL = `${env.PUBLIC_WEB_SSL ? "https" : "http"}://${env.PUBLIC_WEB_DOMAIN}:${env.PUBLIC_WEB_PORT}`;

const framework = new Framework({
  auth: {
    access_control,
    baseURL: BASE_URL,
    roles,
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
  },
  db: {
    database: env.DB_NAME,
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    ssl: env.DB_SSL,
    user: env.DB_USER,
  },
  kvStore: {},
  logs: {},
  pubsub: {},
  rpc: {},
  storage: {
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
  },
});

framework.register(DriveModule, {});

framework.register(OrganizationModule, {});

framework.register(HrModule, {});

export const f = await framework.initialize();
