import { Framework } from "@aspen-os/framework/client";

import { env } from "../env";
import { access_control, roles } from "./auth";

const BASE_URL = `${env.PUBLIC_WEB_SSL ? "https" : "http"}://${env.PUBLIC_WEB_DOMAIN}:${env.PUBLIC_WEB_PORT}`;

export const f = Framework.create(
  {
    auth: {
      access_control,
      baseURL: BASE_URL,
      roles,
    },
    logs: {},
    rpc: {},
  },
  {},
);

export const auth = f.getUnit("auth");
