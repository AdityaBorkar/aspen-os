import type { AuthClient } from "better-auth/client";

export interface AuthConfig {
  baseURL: string;
}

export interface AuthUnit {
  client: AuthClient<{ plugins: [] }>;
}
