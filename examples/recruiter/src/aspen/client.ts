import type { AuthUnit } from "@aspen-os/framework";
import { Framework } from "@aspen-os/framework/client";

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
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
  },
  logs: {},
  rpc: {},
});

await framework.initialize();

export const auth = (framework.getUnit("auth") as unknown as AuthUnit).client;
