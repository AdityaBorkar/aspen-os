import type { createAccessControl, Role } from "better-auth/client";
import type { createAuthClient } from "better-auth/react";

export interface AuthConfig {
  access_control: ReturnType<typeof createAccessControl>;
  baseURL: string;
  roles: Record<string, Role>;
}

export interface AuthUnit {
  client: typeof createAuthClient<{ plugins: [] }>;
}
