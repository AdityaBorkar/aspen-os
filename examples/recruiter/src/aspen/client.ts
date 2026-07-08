import type { AuthUnit } from "@aspen-os/framework";
import { Framework } from "@aspen-os/framework/client";

import { env } from "../env";

const BASE_URL = `${env.PUBLIC_WEB_SSL ? "https" : "http"}://${env.PUBLIC_WEB_DOMAIN}:${env.PUBLIC_WEB_PORT}`;

export const framework = new Framework({
  auth: { baseURL: BASE_URL },
  logs: {},
  rpc: {},
});

await framework.initialize();

export const auth = (framework.getUnit("auth") as unknown as AuthUnit).client;
