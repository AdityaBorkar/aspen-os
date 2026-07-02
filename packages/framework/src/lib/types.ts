export interface ModuleConfig {
  database: DatabaseConfig;
}

export interface DatabaseConfig {
  database: string;
  host: string;
  maxConnections?: number;
  password: string;
  port: number;
  ssl?: boolean;
  user: string;
}

export interface PaginationParams {
  limit?: number;
  page?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  limit: number;
  page: number;
  total: number;
  totalPages: number;
}

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export interface Module {
  destroy(): Promise<void>;
  healthCheck(): Promise<boolean>;
  initialize(): Promise<void>;
  readonly name: string;
}
