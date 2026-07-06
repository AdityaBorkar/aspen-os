import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

declare const window: Window & typeof globalThis;

export const env = createEnv({
  client: {},
  clientPrefix: "PUBLIC_",
  emptyStringAsUndefined: true,
  runtimeEnv: typeof window === "undefined" ? process.env : import.meta.env,
  server: {
    AUTH_SECRET: z.string().min(1),
    DB_HOST: z.string().min(1),
    DB_NAME: z.string().min(1),
    DB_PASSWORD: z.string().default(""),
    DB_PORT: z.string().transform(Number),
    DB_SSL: z.string().transform((val) => val === "true"),
    DB_USER: z.string().min(1),
    WEB_DOMAIN: z.string().min(1),
    WEB_PORT: z.string().transform(Number),
    WEB_SSL: z.string().transform((val) => val === "true"),
  },
});
