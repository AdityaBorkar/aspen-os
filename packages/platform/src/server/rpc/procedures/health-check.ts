import { base } from "../base";

export const healthCheck = base.handler(async () => {
  return { status: "ok" as const };
});
