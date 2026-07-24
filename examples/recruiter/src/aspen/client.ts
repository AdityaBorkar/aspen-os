import { Platform } from "@aspen-os/platform/client";

import { env } from "../env";

const baseURL = `${env.PUBLIC_WEB_SSL ? "https" : "http"}://${env.PUBLIC_WEB_DOMAIN}:${env.PUBLIC_WEB_PORT}`;

export const p = Platform.create(
  {
    auth: { baseURL },
    logs: {},
    rpc: {},
  },
  [],
);
