import { base } from "../base";

export const echo = base.handler(async () => ({ echo: "input.message" }));
