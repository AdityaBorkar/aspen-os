import type { Role, Session, User } from "./types";

export interface AuthEventMap {
	"user:created": UserCreatedEvent;
	"user:updated": UserUpdatedEvent;
	"user:deleted": UserDeletedEvent;
	"role:assigned": RoleAssignedEvent;
	"role:unassigned": RoleUnassignedEvent;
	"role:created": RoleCreatedEvent;
	"role:deleted": RoleDeletedEvent;
	"session:created": SessionCreatedEvent;
	"session:invalidated": SessionInvalidatedEvent;
}

export interface UserCreatedEvent {
	user: User;
}

export interface UserUpdatedEvent {
	user: User;
}

export interface UserDeletedEvent {
	userId: string;
}

export interface RoleAssignedEvent {
	userId: string;
	roleName: string;
}

export interface RoleUnassignedEvent {
	userId: string;
	roleName: string;
}

export interface RoleCreatedEvent {
	role: Role;
}

export interface RoleDeletedEvent {
	roleName: string;
}

export interface SessionCreatedEvent {
	user: User;
	session: Session;
}

export interface SessionInvalidatedEvent {
	sessionId: string;
}
