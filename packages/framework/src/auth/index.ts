import { type Auth, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  adminClient,
  customSessionClient,
  phoneNumberClient,
} from "better-auth/client/plugins";
import type { Role } from "better-auth/plugins/access";
import { createAuthClient } from "better-auth/react";

import type { Unit, UnitDeps } from "../types";
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

export class AuthUnit implements Unit {
  readonly name = "auth";
  readonly client;
  readonly db_schema = db_schema;

  private config: Omit<AuthConfig, "access_control" | "roles">;
  private accessControl: AuthConfig["access_control"];
  private roles: AuthConfig["roles"];
  private auth: Auth | null = null;
  private workflows: {
    role: ReturnType<typeof createRoleWorkflows>;
    session: ReturnType<typeof createSessionWorkflows>;
    user: ReturnType<typeof createUserWorkflows>;
  } | null = null;

  readonly server: {
    $: Auth;
    handler: (request: Request) => Promise<Response>;
    workflows: {
      user: import("./types").UserAPI;
      session: import("./types").SessionAPI;
      role: import("./types").RoleAPI;
    };
  };

  constructor(config: AuthConfig) {
    const { access_control, roles, ...rest } = config;
    this.config = rest;
    this.accessControl = access_control;
    this.roles = roles;

    this.client = createAuthClient({
      plugins: [
        phoneNumberClient(),
        adminClient({
          ac: this.accessControl,
          roles: this.roles as { [key in string]: Role },
        }),
        customSessionClient(),
      ],
    });

    const self = this;
    this.server = {
      get $(): Auth {
        if (!self.auth) throw new Error("Auth unit not initialized");
        return self.auth;
      },

      handler: async (request: Request): Promise<Response> => {
        if (!self.auth) throw new Error("Auth unit not initialized");
        return self.auth.handler(request);
      },

      workflows: {
        get role() {
          if (!self.workflows) throw new Error("Auth unit not initialized");
          return {
            delete: self.workflows.role.deleteRole,
            list: self.workflows.role.getAllRoles as () => Promise<RoleData[]>,
          };
        },
        get session() {
          if (!self.workflows) throw new Error("Auth unit not initialized");
          return {
            create: self.workflows.session.authenticate,
            invalidate: self.workflows.session.invalidateSession,
            validate: self.workflows.session.validateSession,
          };
        },
        get user() {
          if (!self.workflows) throw new Error("Auth unit not initialized");
          return {
            create: self.workflows.user.createUser,
            delete: self.workflows.user.deleteUser,
            get(query: { id: string } | { email: string }) {
              if ("id" in query)
                return (
                  self.workflows?.user.getUserById(query.id) ??
                  Promise.resolve(null)
                );
              return (
                self.workflows?.user.getUserByEmail(query.email) ??
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

  async initialize(deps: UnitDeps): Promise<void> {
    this.auth = betterAuth({
      emailAndPassword: { enabled: true },
      ...this.config,
      database: drizzleAdapter(deps.db, {
        camelCase: false,
        provider: "pg",
        schema: db_schema,
        transaction: true,
        usePlural: true,
      }),
    }) as Auth;

    this.workflows = {
      role: createRoleWorkflows(deps),
      session: createSessionWorkflows(
        deps,
        (id: string) =>
          this.workflows?.user.getUserById(id) ?? Promise.resolve(null),
      ),
      user: createUserWorkflows(
        deps,
        () =>
          this.workflows?.role.getRolePermissions("") ?? Promise.resolve([]),
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
  }

  async destroy(): Promise<void> {
    this.auth = null;
    this.workflows = null;
  }

  async healthCheck(): Promise<boolean> {
    return this.auth !== null;
  }
}
