import type { RpcContext } from "#/server/rpc/types";

import { os } from "@orpc/server";

export const base = os.$context<RpcContext>();
