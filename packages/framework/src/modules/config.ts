import { z } from "zod";
import type { DatabaseConfig, ModuleConfig } from "../lib/types";

const databaseConfigSchema = z.object({
	host: z.string().default("localhost"),
	port: z.number().default(5432),
	user: z.string().default("aspen-os"),
	password: z.string().default("aspen-os"),
	database: z.string().default("aspen-os"),
	ssl: z.boolean().optional(),
	maxConnections: z.number().optional(),
});

const moduleConfigSchema = z.object({
	database: databaseConfigSchema,
});

export interface ConfigModule {
	get<T = unknown>(key: string): T | undefined;
	getOrThrow<T = unknown>(key: string): T;
	set(key: string, value: unknown): void;
	getAll(): Record<string, unknown>;
	getDatabase(): DatabaseConfig;
}

const memoryStore = new Map<string, unknown>();

export function createConfigModule(
	overrides?: Partial<ModuleConfig>,
): ConfigModule {
	const envConfig: Partial<ModuleConfig> = {
		database: {
			host: process.env.DB_HOST ?? "localhost",
			port: Number(process.env.DB_PORT ?? 5432),
			user: process.env.DB_USER ?? "aspen-os",
			password: process.env.DB_PASSWORD ?? "aspen-os",
			database: process.env.DB_NAME ?? "aspen-os",
			ssl: process.env.DB_SSL === "true",
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

		getAll(): Record<string, unknown> {
			return Object.fromEntries(memoryStore);
		},

		getDatabase(): DatabaseConfig {
			return parsed.database;
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
