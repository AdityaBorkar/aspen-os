import type { RoleData, Session, User } from "./types";

export interface AuthEventMap {
  "role:assigned": RoleAssignedEvent;
  "role:created": RoleCreatedEvent;
  "role:deleted": RoleDeletedEvent;
  "role:unassigned": RoleUnassignedEvent;
  "session:created": SessionCreatedEvent;
  "session:invalidated": SessionInvalidatedEvent;
  "user:created": UserCreatedEvent;
  "user:deleted": UserDeletedEvent;
  "user:updated": UserUpdatedEvent;
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
  roleName: string;
  userId: string;
}

export interface RoleUnassignedEvent {
  userId: string;
}

export interface RoleCreatedEvent {
  role: RoleData;
}

export interface RoleDeletedEvent {
  roleName: string;
}

export interface SessionCreatedEvent {
  session: Session;
  user: User;
}

export interface SessionInvalidatedEvent {
  sessionId: string;
}
