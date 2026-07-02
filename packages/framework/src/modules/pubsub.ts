import PgBoss from "pg-boss";
import type { DatabaseConfig } from "../lib/types";

export interface PubSubConfig {
	database: DatabaseConfig;
	schema?: string;
	monitorStateIntervalSeconds?: number;
}

export interface PublishOptions {
	priority?: number;
	retryLimit?: number;
	retryDelay?: number;
	retryBackoff?: boolean;
	startAfter?: Date | string;
	expireInMinutes?: number;
}

export interface Message<T = unknown> {
	id: string;
	data: T;
	name: string;
	createdOn: Date;
	completedOn?: Date;
}

export type MessageHandler<T = unknown> = (
	message: Message<T>,
) => void | Promise<void>;

export interface PubSubModule {
	initialize(): Promise<void>;
	destroy(): Promise<void>;

	publish<T = unknown>(
		topic: string,
		data: T,
		options?: PublishOptions,
	): Promise<string>;
	subscribe<T = unknown>(
		topic: string,
		handler: MessageHandler<T>,
	): Promise<void>;
	unsubscribe(topic: string): Promise<void>;

	publishBatch<T = unknown>(
		topic: string,
		messages: { data: T; options?: PublishOptions }[],
	): Promise<string[]>;

	getQueueSize(topic: string): Promise<number>;
	purgeQueue(topic: string): Promise<void>;
}

export function createPubSubModule(config: PubSubConfig): PubSubModule {
	let boss: PgBoss | null = null;
	const subscriptions = new Map<string, PgBoss.WorkHandler<object>>();

	async function initialize(): Promise<void> {
		boss = new PgBoss({
			host: config.database.host,
			port: config.database.port,
			user: config.database.user,
			password: config.database.password,
			database: config.database.database,
			schema: config.database.ssl ? "pgboss" : undefined,
			monitorStateIntervalSeconds: config.monitorStateIntervalSeconds ?? 30,
		});
		await boss.start();
	}

	async function destroy(): Promise<void> {
		if (boss) {
			await boss.stop();
			boss = null;
		}
	}

	async function publish<T = unknown>(
		topic: string,
		data: T,
		options?: PublishOptions,
	): Promise<string> {
		if (!boss) throw new Error("PubSub not initialized");
		const id = await boss.send(topic, data as object, {
			priority: options?.priority,
			retryLimit: options?.retryLimit,
			retryDelay: options?.retryDelay,
			retryBackoff: options?.retryBackoff,
			startAfter: options?.startAfter,
			expireInMinutes: options?.expireInMinutes,
		});
		if (!id) throw new Error("Failed to publish message");
		return id;
	}

	async function subscribe<T = unknown>(
		topic: string,
		handler: MessageHandler<T>,
	): Promise<void> {
		if (!boss) throw new Error("PubSub not initialized");
		const workHandler: PgBoss.WorkHandler<object> = async (jobs) => {
			for (const job of jobs) {
				await handler({
					id: job.id,
					data: job.data as T,
					name: job.name,
					createdOn: new Date(),
				});
			}
		};
		subscriptions.set(topic, workHandler);
		await boss.work(topic, workHandler);
	}

	async function unsubscribe(topic: string): Promise<void> {
		if (!boss) throw new Error("PubSub not initialized");
		subscriptions.delete(topic);
	}

	async function publishBatch<T = unknown>(
		topic: string,
		messages: { data: T; options?: PublishOptions }[],
	): Promise<string[]> {
		if (!boss) throw new Error("PubSub not initialized");
		const jobs = messages.map((msg) => ({
			name: topic,
			data: msg.data as object,
			options: {
				priority: msg.options?.priority,
				retryLimit: msg.options?.retryLimit,
				retryDelay: msg.options?.retryDelay,
				retryBackoff: msg.options?.retryBackoff,
				startAfter: msg.options?.startAfter,
				expireInMinutes: msg.options?.expireInMinutes,
			},
		}));
		const result = await boss.insert(jobs);
		return result ?? [];
	}

	async function getQueueSize(topic: string): Promise<number> {
		if (!boss) throw new Error("PubSub not initialized");
		const sizes = await boss.getQueueSize(topic);
		return sizes;
	}

	async function purgeQueue(topic: string): Promise<void> {
		if (!boss) throw new Error("PubSub not initialized");
		await boss.deleteQueue(topic);
	}

	return {
		initialize,
		destroy,
		publish,
		subscribe,
		unsubscribe,
		publishBatch,
		getQueueSize,
		purgeQueue,
	};
}
