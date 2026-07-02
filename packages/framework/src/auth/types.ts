import type { Auth } from "better-auth";
import type { createAccessControl } from "better-auth/plugins";

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

export interface User {
  createdAt: Date;
  email: string;
  id: string;
  metadata?: Record<string, unknown>;
  name?: string;
  roles: RoleData[];
  updatedAt: Date;
}

export interface Session {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  token: string;
  userId: string;
}

export interface AuthConfig {
  access_control: ReturnType<typeof createAccessControl>;
  baseURL: string;
  roles: Record<string, any>;
  secret: string;
  session: { expiresIn?: number };
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
  update(
    id: string,
    data: Partial<Pick<User, "name" | "metadata">>,
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

export interface RoleAPI {
  delete(name: string): Promise<void>;
  list(): Promise<RoleData[]>;
}

export interface AuthUnit {
  client: any;
  db_schema: Record<string, unknown>;
  server: {
    $: Auth;
    handler: (request: Request) => Promise<Response>;
    workflows: {
      user: UserAPI;
      session: SessionAPI;
      role: RoleAPI;
    };
  };
}
