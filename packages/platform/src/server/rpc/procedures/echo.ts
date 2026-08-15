import { base } from "#/server/rpc/base";

export const echo = base.handler(async () => ({ echo: "input.message" }));
