export interface ModuleConfig {
	database: DatabaseConfig;
}

export interface DatabaseConfig {
	host: string;
	port: number;
	user: string;
	password: string;
	database: string;
	ssl?: boolean;
	maxConnections?: number;
}

export interface PaginationParams {
	page?: number;
	limit?: number;
}

export interface PaginatedResult<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export type Result<T, E = Error> =
	| { success: true; data: T }
	| { success: false; error: E };

export interface Module {
	readonly name: string;
	initialize(): Promise<void>;
	destroy(): Promise<void>;
	healthCheck(): Promise<boolean>;
}
