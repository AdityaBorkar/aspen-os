import { base } from "#/server/rpc/base";

export const healthCheck = base.handler(async () => ({ status: "ok" as const }));
