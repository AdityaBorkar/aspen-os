import type { createAccessControl, Role } from "better-auth/plugins";

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
  access_control: ReturnType<typeof createAccessControl>;
  baseURL: string;
  roles: Record<string, Role>;
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

export interface CreateUserInput {
  email: string;
  name?: string;
  password: string;
}

export interface UserAPI {
  create(data: CreateUserInput): Promise<User>;
  delete(id: string): Promise<void>;
  get(query: { id: string }): Promise<User | null>;
  get(query: { email: string }): Promise<User | null>;
  role: {
    assign(userId: string, roleName: string): Promise<void>;
    unassign(userId: string): Promise<void>;
  };
  update(
    id: string,
    data: Partial<Pick<User, "name" | "image" | "role">>,
  ): Promise<User>;
}

export interface SessionAPI {
  create(
    email: string,
    password: string,
  ): Promise<{ user: User; session: Session }>;
  invalidate(sessionId: string): Promise<void>;
  validate(token: string): Promise<{ user: User; session: Session } | null>;
}

export interface RoleData {
  createdAt: Date;
  description?: string;
  id: string;
  name: string;
  permissions: [];
  updatedAt: Date;
}

export interface RoleAPI {
  delete(name: string): Promise<void>;
  list(): Promise<RoleData[]>;
}
