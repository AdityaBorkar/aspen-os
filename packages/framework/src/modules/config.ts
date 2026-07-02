import { z } from "zod";

import type { DatabaseConfig, ModuleConfig } from "../lib/types";

const databaseConfigSchema = z.object({
  database: z.string().default("aspen-os"),
  host: z.string().default("localhost"),
  maxConnections: z.number().optional(),
  password: z.string().default("aspen-os"),
  port: z.number().default(5432),
  ssl: z.boolean().optional(),
  user: z.string().default("aspen-os"),
});

const moduleConfigSchema = z.object({
  database: databaseConfigSchema,
});

export interface ConfigModule {
  get<T = unknown>(key: string): T | undefined;
  getAll(): Record<string, unknown>;
  getDatabase(): DatabaseConfig;
  getOrThrow<T = unknown>(key: string): T;
  set(key: string, value: unknown): void;
}

const memoryStore = new Map<string, unknown>();

export function createConfigModule(
  overrides?: Partial<ModuleConfig>,
): ConfigModule {
  const envConfig: Partial<ModuleConfig> = {
    database: {
      database: process.env.DB_NAME ?? "aspen-os",
      host: process.env.DB_HOST ?? "localhost",
      password: process.env.DB_PASSWORD ?? "aspen-os",
      port: Number(process.env.DB_PORT ?? 5432),
      ssl: process.env.DB_SSL === "true",
      user: process.env.DB_USER ?? "aspen-os",
    },
  };

  const merged = deepMerge(envConfig, overrides ?? {});
  const parsed = moduleConfigSchema.parse(merged);

  for (const [key, value] of Object.entries(parsed)) {
    memoryStore.set(key, value);
  }

  return {
    get<T = unknown>(key: string): T | undefined {
      return memoryStore.get(key) as T | undefined;
    },

    getAll(): Record<string, unknown> {
      return Object.fromEntries(memoryStore);
    },

    getDatabase(): DatabaseConfig {
      return parsed.database;
    },

    getOrThrow<T = unknown>(key: string): T {
      const value = memoryStore.get(key);
      if (value === undefined) {
        throw new Error(`Config key "${key}" not found`);
      }
      return value as T;
    },

    set(key: string, value: unknown): void {
      memoryStore.set(key, value);
    },
  };
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] instanceof Object &&
      key in target &&
      target[key] instanceof Object
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>,
      );
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}
