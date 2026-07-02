import { type Auth, betterAuth } from "better-auth";

import * as db_schema from "./db-schema";
import type { AuthConfig, AuthModule } from "./types";
import {
  assignRole,
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
  AuthModule,
  Permission,
  RoleAPI,
  RoleDefinition,
  Session,
  SessionAPI,
  User,
  UserAPI,
} from "./types";

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  adminClient,
  customSessionClient,
  phoneNumberClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { getContext } from "@/lib";

export { createAccessControl } from "better-auth/plugins/access";

export function createAuthModule(config: AuthConfig): AuthModule {
  const { access_control, roles, ...$config } = config;

  let auth: Auth | null = null;

  async function register() {
    const { db } = getContext();
    auth = betterAuth({
      emailAndPassword: { enabled: true },
      ...$config,
      database: drizzleAdapter(db, {
        camelCase: false,
        provider: "pg",
        schema: db_schema,
        transaction: true,
        usePlural: true,
      }),
    });
  }

  async function terminate() {
    auth = null;
  }

  async function handler(request: Request): Promise<Response> {
    if (!auth) throw new Error("Auth module not initialized");
    return auth.handler(request);
  }

  const client = createAuthClient({
    plugins: [
      phoneNumberClient(),
      adminClient({ ac: access_control, roles }),
      customSessionClient<typeof auth>(),
    ],
  });

  return {
    client,
    db_schema,
    register,
    server: {
      $: auth,
      handler,
      workflows: {
        role: {
          delete: deleteRole,
          list: getAllRoles,
        },
        session: {
          create: authenticate,
          invalidate: invalidateSession,
          validate: validateSession,
        },
        user: {
          create: createUser,
          delete: deleteUser,
          get(query) {
            if ("id" in query) return getUserById(query.id);
            return getUserByEmail(query.email);
          },
          permission: {
            check: hasPermission,
            list: getUserPermissions,
          },
          role: {
            assign: assignRole,
            list: getUserRoles,
            unassign: unassignRole,
          },
          update: updateUser,
        },
      },
    },
    terminate,
  };
}
