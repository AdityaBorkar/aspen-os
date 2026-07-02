import * as db_schema from "./db-schema";
import type { AuthConfig, AuthModule } from "./types";
import {
	assignRole,
	createRole,
	deleteRole,
	getAllRoles,
	getUserPermissions,
	getUserRoles,
	hasPermission,
	 unassignRole,
} from "./workflows/role";
import {
	authenticate,
	invalidateSession,
	validateSession,
} from "./workflows/session";
import {
	createUser,
	deleteUser,
	getUserByEmail,
	getUserById,
	updateUser,
} from "./workflows/user";
export type {
	AuthConfig,
	AuthModule,
	Permission,
	Role,
	RoleAPI,
	RoleDefinition,
	Session,
	SessionAPI,
	User,
	UserAPI,
} from "./types";
export type {
	AuthEventMap,
	UserCreatedEvent,
	UserUpdatedEvent,
	UserDeletedEvent,
	RoleAssignedEvent,
	RoleUnassignedEvent,
	RoleCreatedEvent,
	RoleDeletedEvent,
	SessionCreatedEvent,
	SessionInvalidatedEvent,
} from "./event-map";

export function createAuthModule(config: AuthConfig): AuthModule {
	async function register(): Promise<void> {
		for (const roleDef of config.roles) {
			await createRole(roleDef.name, roleDef.permissions, roleDef.description);
		}
	}

	async function terminate(): Promise<void> {}

	return {
		register,
		db_schema,
		terminate,
		workflows: {
			user: {
				create: createUser,
				get(query) {
					if ("id" in query) return getUserById(query.id);
					return getUserByEmail(query.email);
				},
				update: updateUser,
				delete: deleteUser,
				role: {
					assign: assignRole,
					unassign: unassignRole,
					list: getUserRoles,
				},
				permission: {
					check: hasPermission,
					list: getUserPermissions,
				},
			},
			session: {
				create: authenticate,
				validate: validateSession,
				invalidate: invalidateSession,
			},
			role: {
				delete: deleteRole,
				list: getAllRoles,
			},
		},
	};
}
