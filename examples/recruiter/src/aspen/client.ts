import type { LogConfig, RpcConfig } from "@aspen-os/platform/client";
import { Platform } from "@aspen-os/platform/client";

import { env } from "../env";
import { access_control, roles } from "./auth";

const BASE_URL = `${env.PUBLIC_WEB_SSL ? "https" : "http"}://${env.PUBLIC_WEB_DOMAIN}:${env.PUBLIC_WEB_PORT}`;

const auth = {
  access_control,
  baseURL: BASE_URL,
  roles,
};

const logs = {} satisfies LogConfig;

const rpc = {} satisfies RpcConfig;

export const p = Platform.create({ auth, logs, rpc }, {});
