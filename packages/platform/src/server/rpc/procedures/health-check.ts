import { base } from "../base";

export const healthCheck = base.handler(async () => ({ status: "ok" as const }));
