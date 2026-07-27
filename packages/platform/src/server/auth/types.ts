import type { Auth } from "better-auth";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { PubSubUnit } from "../pubsub";

export interface AuthServiceDeps {
  auth: Auth;
  db: NodePgDatabase<Record<string, never>>;
  pubsub: PubSubUnit;
}

export interface User {
  banExpires?: Date;
  banned?: boolean;
  banReason?: string;
  createdAt: Date;
  displayUsername?: string;
  email: string;
  emailVerified: boolean;
  id: string;
  image?: string;
  name: string;
  phoneNumber?: string;
  phoneNumberVerified?: boolean;
  role?: string;
  updatedAt: Date;
  username?: string;
}

export interface Session {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  impersonatedBy?: string;
  ipAddress?: string;
  token: string;
  updatedAt: Date;
  userAgent?: string;
  userId: string;
}

export interface AuthConfig {
  baseURL: string;
  cfSecretKey?: string;
  secret: string;
  session: { expiresIn?: number };
  socialProviders?: {
    google?: {
      clientId: string;
      clientSecret: string;
      redirectURI?: string;
    };
  };
}

export interface RoleData {
  createdAt: Date;
  description?: string;
  id: string;
  name: string;
  permissions: [];
  updatedAt: Date;
}
