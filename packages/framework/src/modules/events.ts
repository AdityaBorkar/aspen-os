export type EventListener<T = unknown> = (
	event: Event<T>,
) => void | Promise<void>;

export interface Event<T = unknown> {
	id: string;
	type: string;
	payload: T;
	timestamp: Date;
	source?: string;
	metadata?: Record<string, unknown>;
}

export interface EventPublishOptions {
	source?: string;
	metadata?: Record<string, unknown>;
}

export interface EventsModule {
	initialize(): Promise<void>;
	destroy(): Promise<void>;

	publish<T = unknown>(
		type: string,
		payload: T,
		options?: EventPublishOptions,
	): Promise<Event<T>>;
	subscribe<T = unknown>(type: string, listener: EventListener<T>): () => void;
	unsubscribe(type: string, listener: EventListener): void;
	once<T = unknown>(type: string, listener: EventListener<T>): void;

	getHistory(type: string, limit?: number): Event[];
	clearHistory(): void;
}

export function createEventsModule(): EventsModule {
	const listeners = new Map<string, Set<EventListener>>();
	const history: Event[] = [];
	const maxHistorySize = 1000;

	async function initialize(): Promise<void> {}

	async function destroy(): Promise<void> {
		listeners.clear();
		history.length = 0;
	}

	async function publish<T = unknown>(
		type: string,
		payload: T,
		options?: EventPublishOptions,
	): Promise<Event<T>> {
		const event: Event<T> = {
			id: crypto.randomUUID(),
			type,
			payload,
			timestamp: new Date(),
			source: options?.source,
			metadata: options?.metadata,
		};

		history.push(event as Event);
		if (history.length > maxHistorySize) {
			history.splice(0, history.length - maxHistorySize);
		}

		const typeListeners = listeners.get(type);
		if (typeListeners) {
			for (const listener of typeListeners) {
				try {
					await listener(event as Event);
				} catch (err) {
					console.error(`Error in event listener for "${type}":`, err);
				}
			}
		}

		const wildcardListeners = listeners.get("*");
		if (wildcardListeners) {
			for (const listener of wildcardListeners) {
				try {
					await listener(event as Event);
				} catch (err) {
					console.error(`Error in wildcard event listener:`, err);
				}
			}
		}

		return event;
	}

	function subscribe<T = unknown>(
		type: string,
		listener: EventListener<T>,
	): () => void {
		if (!listeners.has(type)) {
			listeners.set(type, new Set());
		}
		listeners.get(type)!.add(listener as EventListener);
		return () => unsubscribe(type, listener as EventListener);
	}

	function unsubscribe(type: string, listener: EventListener): void {
		listeners.get(type)?.delete(listener);
	}

	function once<T = unknown>(type: string, listener: EventListener<T>): void {
		const wrappedListener: EventListener<T> = async (event) => {
			unsubscribe(type, wrappedListener as EventListener);
			await listener(event);
		};
		subscribe(type, wrappedListener);
	}

	function getHistory(type: string, limit = 100): Event[] {
		return history.filter((e) => e.type === type).slice(-limit);
	}

	function clearHistory(): void {
		history.length = 0;
	}

	return {
		initialize,
		destroy,
		publish,
		subscribe,
		unsubscribe,
		once,
		getHistory,
		clearHistory,
	};
}
