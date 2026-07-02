import { closePool, getDrizzle } from "./lib/db";
import { context } from "./lib/context";
import { createPubSubModule, type PubSubModule } from "./modules/pubsub";
import { createAuthModule, type AuthModule, type RoleDefinition } from "./modules/auth";
import type { DatabaseConfig } from "./lib/types";
import * as authSchema from "./modules/auth/db-schema";

export interface FrameworkConfig {
	db: DatabaseConfig;
	auth: {
		secret: string;
		roles: RoleDefinition[];
		sessionExpiresIn?: number;
	};
}

export class Framework {
	private config: FrameworkConfig;
	private authModule: AuthModule | null = null;
	private pubsubModule: PubSubModule | null = null;
	private initialized = false;

	constructor(config: FrameworkConfig) {
		this.config = config;
	}

	async initialize(): Promise<void> {
		if (this.initialized) throw new Error("Framework already initialized");

		const db = getDrizzle(this.config.db, authSchema);

		this.pubsubModule = createPubSubModule({ database: this.config.db });
		await this.pubsubModule.initialize();

		this.authModule = createAuthModule({
			database: this.config.db,
			secret: this.config.auth.secret,
			roles: this.config.auth.roles,
			sessionExpiresIn: this.config.auth.sessionExpiresIn,
		});

		await context.run({ db, pubsub: this.pubsubModule }, async () => {
			await this.authModule!.register();
		});

		this.initialized = true;
	}

	async run<T>(fn: () => T | Promise<T>): Promise<T> {
		if (!this.initialized) throw new Error("Framework not initialized");
		const db = getDrizzle(this.config.db, authSchema);
		return context.run({ db, pubsub: this.pubsubModule! }, fn);
	}

	async destroy(): Promise<void> {
		if (this.authModule) await this.authModule.terminate();
		if (this.pubsubModule) await this.pubsubModule.destroy();
		await closePool();
		this.initialized = false;
	}

	get auth(): AuthModule {
		if (!this.authModule) throw new Error("Framework not initialized");
		return this.authModule;
	}

	get pubsub(): PubSubModule {
		if (!this.pubsubModule) throw new Error("Framework not initialized");
		return this.pubsubModule;
	}
}
