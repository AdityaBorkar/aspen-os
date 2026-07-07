export interface DatabaseConfig {
  database: string;
  host: string;
  maxConnections?: number;
  password: string;
  port: number;
  ssl?: boolean;
  user: string;
}

export interface Module {
  destroy(): Promise<void>;
  healthCheck(): Promise<boolean>;
  readonly name: string;
}
