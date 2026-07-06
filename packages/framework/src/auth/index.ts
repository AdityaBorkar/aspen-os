import { type Auth, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  adminClient,
  customSessionClient,
  phoneNumberClient,
} from "better-auth/client/plugins";
import type { Role } from "better-auth/plugins/access";
import { createAuthClient } from "better-auth/react";

import type { DatabaseUnit } from "../db";
import type { LoggingUnit } from "../logs";
import type { PubSubUnit } from "../pubsub";
import * as db_schema from "./db-schema";
import type { AuthConfig, RoleData } from "./types";
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
  Permission,
  RoleAPI,
  RoleData,
  RoleDefinition,
  Session,
  SessionAPI,
  User,
  UserAPI,
} from "./types";

export class AuthUnit {
  readonly name = "auth";
  readonly client;
  readonly db_schema = db_schema;

  private auth: Auth;
  private workflows: {
    role: ReturnType<typeof createRoleWorkflows>;
    session: ReturnType<typeof createSessionWorkflows>;
    user: ReturnType<typeof createUserWorkflows>;
  };

  readonly server: {
    $: Auth;
    handler: (request: Request) => Promise<Response>;
    workflows: {
      user: import("./types").UserAPI;
      session: import("./types").SessionAPI;
      role: import("./types").RoleAPI;
    };
  };

  constructor(
    config: AuthConfig,
    { db, logs: _logs, pubsub }: { db: DatabaseUnit; logs: LoggingUnit; pubsub: PubSubUnit },
  ) {
    const { access_control, roles, ...rest } = config;

    this.client = createAuthClient({
      plugins: [
        phoneNumberClient(),
        adminClient({
          ac: access_control,
          roles: roles as { [key in string]: Role },
        }),
        customSessionClient(),
      ],
    });

    this.auth = betterAuth({
      emailAndPassword: { enabled: true },
      ...rest,
      database: drizzleAdapter(db.db, {
        camelCase: false,
        provider: "pg",
        schema: db_schema,
        transaction: true,
        usePlural: true,
      }),
    }) as Auth;

    const deps = { db: db.db, pubsub };
    this.workflows = {
      role: createRoleWorkflows(deps),
      session: createSessionWorkflows(
        deps,
        (id: string) =>
          this.workflows.user.getUserById(id) ?? Promise.resolve(null),
      ),
      user: createUserWorkflows(
        deps,
        () => this.workflows.role.getRolePermissions("") ?? Promise.resolve([]),
      ),
    };

    // Re-wire user with proper getRolePermissions
    this.workflows.user = createUserWorkflows(
      deps,
      this.workflows.role.getRolePermissions,
    );
    this.workflows.session = createSessionWorkflows(
      deps,
      this.workflows.user.getUserById,
    );

    const self = this;
    this.server = {
      get $(): Auth {
        return self.auth;
      },

      handler: async (request: Request): Promise<Response> => {
        return self.auth.handler(request);
      },

      workflows: {
        get role() {
          return {
            delete: self.workflows.role.deleteRole,
            list: self.workflows.role.getAllRoles as () => Promise<RoleData[]>,
          };
        },
        get session() {
          return {
            create: self.workflows.session.authenticate,
            invalidate: self.workflows.session.invalidateSession,
            validate: self.workflows.session.validateSession,
          };
        },
        get user() {
          return {
            create: self.workflows.user.createUser,
            delete: self.workflows.user.deleteUser,
            get(query: { id: string } | { email: string }) {
              if ("id" in query)
                return (
                  self.workflows.user.getUserById(query.id) ??
                  Promise.resolve(null)
                );
              return (
                self.workflows.user.getUserByEmail(query.email) ??
                Promise.resolve(null)
              );
            },
            permission: {
              check: self.workflows.user.hasPermission,
              list: self.workflows.user.getUserPermissions,
            },
            role: {
              assign: self.workflows.role.assignRole,
              list: self.workflows.user.getUserRoles as () => Promise<
                RoleData[]
              >,
              unassign: self.workflows.role.unassignRole,
            },
            update: self.workflows.user.updateUser,
          };
        },
      },
    };
  }

  async destroy(): Promise<void> {
    // Auth cleanup if needed
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
