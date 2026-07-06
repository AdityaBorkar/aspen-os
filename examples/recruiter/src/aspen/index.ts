import { Framework } from "@aspen-os/framework";

import { env } from "../env";
import { access_control, roles } from "./auth";

const BASE_URL = `${env.WEB_SSL ? "https" : "http"}://${env.WEB_DOMAIN}:${env.WEB_PORT}`;

export const framework = new Framework({
  auth: {
    access_control,
    baseURL: BASE_URL,
    roles,
    secret: env.AUTH_SECRET,
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
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
  logs: {},
  pubsub: {},
  rpc: {},
  storage: {},
});

await framework.initialize();
