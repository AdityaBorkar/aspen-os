import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

declare const window: Window & typeof globalThis;

export const env = createEnv({
  client: {
    PUBLIC_WEB_DOMAIN: z.string().min(1),
    PUBLIC_WEB_PORT: z.string().transform(Number),
    PUBLIC_WEB_SSL: z.string().transform((val) => val === "true"),
  },
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
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    STORAGE_ACCESS_KEY: z.string().min(1),
    STORAGE_BUCKET: z.string().min(1),
    STORAGE_ENDPOINT: z.string().min(1),
    STORAGE_FORCE_PATH_STYLE: z.string().transform((val) => val === "true"),
    STORAGE_REGION: z.string().min(1),
    STORAGE_SECRET_KEY: z.string().min(1),
  },
});
