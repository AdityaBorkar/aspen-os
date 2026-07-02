import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type pg from "pg";

export interface DatabaseConfig {
  database: string;
  host: string;
  maxConnections?: number;
  password: string;
  port: number;
  ssl?: boolean;
  user: string;
}

export interface UnitDeps {
  db: NodePgDatabase<Record<string, never>>;
  pool: pg.Pool;
  pubsub: {
    publish<T = unknown>(topic: string, data: T): Promise<string>;
  };
}

export interface Unit {
  destroy(): Promise<void>;
  healthCheck(): Promise<boolean>;
  initialize(deps: UnitDeps): Promise<void>;
  readonly name: string;
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
