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

interface UserCreatedEvent {
  user: User;
}

interface UserUpdatedEvent {
  user: User;
}

interface UserDeletedEvent {
  userId: string;
}

interface RoleAssignedEvent {
  roleName: string;
  userId: string;
}

interface RoleUnassignedEvent {
  userId: string;
}

interface RoleCreatedEvent {
  role: RoleData;
}

interface RoleDeletedEvent {
  roleName: string;
}

interface SessionCreatedEvent {
  session: Session;
  user: User;
}

interface SessionInvalidatedEvent {
  sessionId: string;
}
