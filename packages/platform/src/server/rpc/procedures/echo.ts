import { base } from "../base";

export const echo = base.handler(async () => {
  return { echo: "input.message" };
});
