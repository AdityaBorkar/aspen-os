import type { DatabaseConfig } from "../../lib/types";

export interface Role {
	id: string;
	name: string;
	description?: string;
	permissions: Permission[];
	createdAt: Date;
	updatedAt: Date;
}

export interface Permission {
	id: string;
	resource: string;
	action: string;
	description?: string;
}

export interface User {
	id: string;
	email: string;
	name?: string;
	roles: Role[];
	metadata?: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

export interface Session {
	id: string;
	userId: string;
	token: string;
	expiresAt: Date;
	createdAt: Date;
}

export interface AuthConfig {
	database: DatabaseConfig;
	secret: string;
	sessionExpiresIn?: number;
	roles: RoleDefinition[];
}

export interface RoleDefinition {
	name: string;
	description?: string;
	permissions: { resource: string; action: string }[];
}

export interface CreateUserInput {
	email: string;
	password: string;
	name?: string;
	metadata?: Record<string, unknown>;
}

export interface UserAPI {
	create(data: CreateUserInput): Promise<User>;
	get(query: { id: string }): Promise<User | null>;
	get(query: { email: string }): Promise<User | null>;
	update(
		id: string,
		data: Partial<Pick<User, "name" | "metadata">>,
	): Promise<User>;
	delete(id: string): Promise<void>;

	role: {
		assign(userId: string, roleName: string): Promise<void>;
		unassign(userId: string, roleName: string): Promise<void>;
		list(userId: string): Promise<Role[]>;
	};

	permission: {
		check(userId: string, resource: string, action: string): Promise<boolean>;
		list(userId: string): Promise<Permission[]>;
	};
}

export interface SessionAPI {
	create(
		email: string,
		password: string,
	): Promise<{ user: User; session: Session }>;
	validate(token: string): Promise<{ user: User; session: Session } | null>;
	invalidate(sessionId: string): Promise<void>;
}

export interface RoleAPI {
	delete(name: string): Promise<void>;
	list(): Promise<Role[]>;
}

export interface AuthModule {
	register(): Promise<void>;
	terminate(): Promise<void>;

	db_schema: Record<string, unknown>;

	workflows: {
		user: UserAPI;
		session: SessionAPI;
		role: RoleAPI;
	};
}
