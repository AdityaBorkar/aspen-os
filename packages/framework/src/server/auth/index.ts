import { type Auth, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  adminClient,
  customSessionClient,
  phoneNumberClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { DatabaseUnit } from "../db";
import type { LogUnit } from "../log";
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
  RoleAPI,
  RoleData,
  Session,
  SessionAPI,
  User,
  UserAPI,
} from "./types";

export class AuthUnit {
  readonly name = "auth";
  readonly client: ReturnType<typeof createAuthClient>;
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
    {
      db,
      logs: _logs,
      pubsub,
    }: { db: DatabaseUnit; logs: LogUnit; pubsub: PubSubUnit },
  ) {
    const { access_control, roles, ...rest } = config;

    this.client = createAuthClient({
      plugins: [phoneNumberClient(), adminClient({}), customSessionClient()],
    });

    this.auth = betterAuth({
      emailAndPassword: { enabled: true },
      ...rest,
      database: drizzleAdapter(db.db, {
        camelCase: false,
        provider: "pg",
        schema: db_schema,
        transaction: true,
        usePlural: false,
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
      user: createUserWorkflows(deps),
    };

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
            role: {
              assign: self.workflows.role.assignRole,
              unassign: self.workflows.role.unassignRole,
            },
            update: self.workflows.user.updateUser,
          };
        },
      },
    };
  }

  async prepare(): Promise<void> {
    return;
  }

  async destroy(): Promise<void> {
    // Auth cleanup if needed
  }
}
