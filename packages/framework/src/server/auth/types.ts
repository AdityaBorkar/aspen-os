import type { Session, User } from "better-auth";
import type { createAccessControl, Role } from "better-auth/plugins";

export type { Session, User };

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

export interface Permission {
  action: string;
  description?: string;
  id: string;
  resource: string;
}

export interface RoleData {
  createdAt: Date;
  description?: string;
  id: string;
  name: string;
  permissions: Permission[];
  updatedAt: Date;
}

export interface RoleDefinition {
  id: string;
  name: string;
  permissions: { resource: string; action: string }[];
}

export interface CreateUserInput {
  email: string;
  metadata?: Record<string, unknown>;
  name?: string;
  password: string;
}

export interface UserAPI {
  create(data: CreateUserInput): Promise<User>;
  delete(id: string): Promise<void>;
  get(query: { id: string }): Promise<User | null>;
  get(query: { email: string }): Promise<User | null>;

  permission: {
    check(userId: string, resource: string, action: string): Promise<boolean>;
    list(userId: string): Promise<Permission[]>;
  };

  role: {
    assign(userId: string, roleName: string): Promise<void>;
    unassign(userId: string, roleName: string): Promise<void>;
    list(userId: string): Promise<RoleData[]>;
  };
  update(id: string, data: Partial<Pick<User, "name">>): Promise<User>;
}

export interface SessionAPI {
  create(
    email: string,
    password: string,
  ): Promise<{ user: User; session: Session }>;
  invalidate(sessionId: string): Promise<void>;
  validate(token: string): Promise<{ user: User; session: Session } | null>;
}

export interface RoleAPI {
  delete(name: string): Promise<void>;
  list(): Promise<RoleData[]>;
}
