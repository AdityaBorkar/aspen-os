import pino from "pino";

export const logger = pino({
  base: {
    env: "browser",
    service: "client",
  },
  level: "info",
});
