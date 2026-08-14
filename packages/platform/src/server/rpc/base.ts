import { os } from "@orpc/server";

import type { RpcContext } from "./types";

export const base = os.$context<RpcContext>();
