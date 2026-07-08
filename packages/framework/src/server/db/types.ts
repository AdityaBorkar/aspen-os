export type DatabaseConfig = {
  database: string;
  host: string;
  maxConnections?: number;
  password: string;
  port: number;
  ssl?: boolean;
  user: string;
};
