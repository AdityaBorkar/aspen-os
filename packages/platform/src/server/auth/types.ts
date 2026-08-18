import type { PubSubUnit } from "#/server/pubsub";

import type { BetterAuthOptions } from "better-auth";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type { createBetterAuthService } from "./unit";

type DrizzleDB = PostgresJsDatabase;

export type AuthConfig = BetterAuthOptions;

export type AuthService = ReturnType<typeof createBetterAuthService>;

export interface AuthServiceDeps {
  auth: AuthService;
  db: DrizzleDB;
  pubsub: PubSubUnit | null;
}

export type Session = AuthService["$Infer"]["Session"]["session"];
export type User = AuthService["$Infer"]["Session"]["user"];

export interface RoleData {
  createdAt: Date;
  description?: string;
  id: string;
  name: string;
  permissions: [];
  updatedAt: Date;
}
