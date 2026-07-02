import { type Auth, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  adminClient,
  customSessionClient,
  phoneNumberClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { Unit, UnitDeps } from "../types";
import * as db_schema from "./db-schema";
import type { AuthConfig, AuthUnit } from "./types";
import { createRoleWorkflows } from "./workflows/role";
import { createSessionWorkflows } from "./workflows/session";
import { createUserWorkflows } from "./workflows/user";

export { createAccessControl } from "better-auth/plugins/access";

export type {
  AuthEventMap,
  RoleAssignedEvent,
  RoleCreatedEvent,
  RoleDeletedEvent,
  RoleUnassignedEvent,
  SessionCreatedEvent,
  SessionInvalidatedEvent,
  UserCreatedEvent,
  UserDeletedEvent,
  UserUpdatedEvent,
} from "./event-map";
export type {
  AuthConfig,
  AuthUnit,
  Permission,
  RoleAPI,
  RoleDefinition,
  Session,
  SessionAPI,
  User,
  UserAPI,
} from "./types";

export function createAuthUnit(config: AuthConfig): AuthUnit & Unit {
  const { access_control, roles, ...$config } = config;

  let auth: any = null;
  let workflows: {
    role: ReturnType<typeof createRoleWorkflows>;
    session: ReturnType<typeof createSessionWorkflows>;
    user: ReturnType<typeof createUserWorkflows>;
  } | null = null;

  const client = createAuthClient({
    plugins: [
      phoneNumberClient(),
      adminClient({ ac: access_control, roles }),
      customSessionClient(),
    ],
  });

  return {
    client,
    db_schema,

    async destroy() {
      auth = null;
      workflows = null;
    },

    async healthCheck() {
      return auth !== null;
    },

    async initialize(deps: UnitDeps) {
      auth = betterAuth({
        emailAndPassword: { enabled: true },
        ...$config,
        database: drizzleAdapter(deps.db, {
          camelCase: false,
          provider: "pg",
          schema: db_schema,
          transaction: true,
          usePlural: true,
        }),
      });
      workflows = {
        role: createRoleWorkflows(deps),
        session: createSessionWorkflows(deps, (id: string) =>
          workflows?.user.getUserById(id),
        ),
        user: createUserWorkflows(deps, () =>
          workflows?.role.getRolePermissions(""),
        ),
      };
      // Re-wire user with proper getRolePermissions
      workflows.user = createUserWorkflows(
        deps,
        workflows.role.getRolePermissions,
      );
      workflows.session = createSessionWorkflows(
        deps,
        workflows.user.getUserById,
      );
    },
    name: "auth",

    server: {
      get $(): Auth {
        return auth;
      },
      handler: async (request: Request) => {
        if (!auth) throw new Error("Auth unit not initialized");
        return auth.handler(request);
      },
      workflows: {
        get role() {
          if (!workflows) throw new Error("Auth unit not initialized");
          return {
            delete: workflows.role.deleteRole,
            list: workflows.role.getAllRoles as () => Promise<any[]>,
          };
        },
        get session() {
          if (!workflows) throw new Error("Auth unit not initialized");
          return {
            create: workflows.session.authenticate,
            invalidate: workflows.session.invalidateSession,
            validate: workflows.session.validateSession,
          };
        },
        get user() {
          if (!workflows) throw new Error("Auth unit not initialized");
          return {
            create: workflows.user.createUser,
            delete: workflows.user.deleteUser,
            get(query: { id: string } | { email: string }) {
              if ("id" in query) return workflows?.user.getUserById(query.id);
              return workflows?.user.getUserByEmail(query.email);
            },
            permission: {
              check: workflows.user.hasPermission,
              list: workflows.user.getUserPermissions,
            },
            role: {
              assign: workflows.role.assignRole,
              list: workflows.user.getUserRoles as () => Promise<any[]>,
              unassign: workflows.role.unassignRole,
            },
            update: workflows.user.updateUser,
          };
        },
      },
    },
  };
}
