import { Workflow, WorkflowStep } from "@aspen-os/framework/server";
import { and, eq, type SQL } from "drizzle-orm";
import { object, optional, parse } from "valibot";

import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, ROLES } from "../constants";
import { serviceProvider, user } from "../db-schemas";
import { PLATFORM_USER_EVENTS } from "../pubsub-events";
import type {
  CreatePlatformUserInput,
  PlatformUserFilters,
  UpdatePlatformUserInput,
} from "../types";
import {
  CreatePlatformUserSchema,
  IdSchema,
  PlatformUserFiltersSchema,
  RoleSchema,
  UpdatePlatformUserSchema,
} from "../types";
import { logAuditStep } from "./steps";

const CreateInputSchema = object({
  input: CreatePlatformUserSchema,
});

const GetInputSchema = object({
  id: IdSchema,
});

const ListInputSchema = object({
  filters: optional(PlatformUserFiltersSchema),
});

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdatePlatformUserSchema,
});

const AssignRoleInputSchema = object({
  id: IdSchema,
  role: RoleSchema,
});

const AssignSpInputSchema = object({
  spId: IdSchema,
  userId: IdSchema,
});

const fetchUserStep = WorkflowStep.name("fetch-user").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select({
        createdAt: user.createdAt,
        email: user.email,
        id: user.id,
        name: user.name,
        role: user.role,
        spId: user.spId,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Platform user with id "${input.id}" not found.`);
    }

    return result;
  },
);

const createUser = Workflow.name("user.create").handler(
  async (input: { input: CreatePlatformUserInput }, ctx) => {
    if (!ctx.auth) throw new Error("Auth is required for user creation");
    const auth = ctx.auth;
    const { input: parsed } = parse(CreateInputSchema, input);

    if (parsed.role === ROLES.SP_USER && !parsed.spId) {
      throw new Error("spId is required when role is 'sp_user'.");
    }
    if (parsed.role !== ROLES.SP_USER && parsed.spId) {
      throw new Error("spId must not be set when role is not 'sp_user'.");
    }

    if (parsed.spId) {
      const [sp] = await ctx.db
        .select({ status: serviceProvider.status })
        .from(serviceProvider)
        .where(eq(serviceProvider.id, parsed.spId))
        .limit(1);

      if (!sp) {
        throw new Error(`Service Provider with id "${parsed.spId}" not found.`);
      }
    }

    const api = auth.api as unknown as {
      createUser: (opts: unknown) => Promise<unknown>;
    };
    const response = (await api.createUser({
      body: {
        email: parsed.email,
        name: parsed.name,
        password: parsed.password,
        role: parsed.role,
      },
    } as Record<string, unknown>)) as {
      user: { id: string; email: string; role?: string };
    };

    const createdUser = response.user;

    if (parsed.spId) {
      await ctx.db
        .update(user)
        .set({ spId: parsed.spId })
        .where(eq(user.id, createdUser.id));
    }

    await ctx.step.run(logAuditStep, {
      action: AUDIT_ACTION.PLATFORM_USER_CREATED,
      entityId: createdUser.id,
      entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
      newState: {
        email: createdUser.email,
        role: parsed.role,
        spId: parsed.spId ?? null,
      },
    });

    await ctx.pubsub.publish(PLATFORM_USER_EVENTS.CREATED, {
      user: {
        email: createdUser.email,
        id: createdUser.id,
        role: parsed.role,
      },
    });

    return {
      ...createdUser,
      spId: parsed.spId ?? null,
    };
  },
);

const getUser = Workflow.name("user.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchUserStep, { id: input.id });
  },
);

const listUsers = Workflow.name("user.list").handler(
  async (input: { filters?: PlatformUserFilters }, ctx) => {
    return ctx.step.run("query", async () => {
      const { filters } = parse(ListInputSchema, input);
      const parsed = filters ? parse(PlatformUserFiltersSchema, filters) : {};
      const conditions: SQL[] = [];

      if (parsed.role) {
        conditions.push(eq(user.role, parsed.role));
      }
      if (parsed.spId) {
        conditions.push(eq(user.spId, parsed.spId));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db
        .select({
          createdAt: user.createdAt,
          email: user.email,
          id: user.id,
          name: user.name,
          role: user.role,
          spId: user.spId,
          updatedAt: user.updatedAt,
        })
        .from(user)
        .where(whereClause);
    });
  },
);

const updateUser = Workflow.name("user.update").handler(
  async (input: { id: string; patch: UpdatePlatformUserInput }, ctx) => {
    if (!ctx.auth) throw new Error("Auth is required for user update");
    const auth = ctx.auth;
    const { id, patch } = parse(UpdateInputSchema, input);

    if (patch.role === ROLES.SP_USER && patch.spId === null) {
      throw new Error("spId is required when role is 'sp_user'.");
    }
    if (
      patch.role !== undefined &&
      patch.role !== ROLES.SP_USER &&
      patch.spId
    ) {
      throw new Error("spId must not be set when role is not 'sp_user'.");
    }

    if (patch.spId) {
      const [sp] = await ctx.db
        .select({ status: serviceProvider.status })
        .from(serviceProvider)
        .where(eq(serviceProvider.id, patch.spId))
        .limit(1);

      if (!sp) {
        throw new Error(`Service Provider with id "${patch.spId}" not found.`);
      }
    }

    const changes: Record<string, unknown> = {};

    await ctx.step.run("update-auth-user", async () => {
      if (patch.name !== undefined || patch.role !== undefined) {
        const updateData: { name?: string; role?: string } = {};
        if (patch.name !== undefined) {
          updateData.name = patch.name;
          changes.name = patch.name;
        }
        if (patch.role !== undefined) {
          updateData.role = patch.role;
          changes.role = patch.role;
        }

        await auth.user.update({
          data: updateData,
          id,
        });
      }
    });

    await ctx.step.run("update-db-user", async () => {
      if (patch.spId !== undefined) {
        await ctx.db
          .update(user)
          .set({ spId: patch.spId })
          .where(eq(user.id, id));
        changes.spId = patch.spId;
      }
    });

    await ctx.step.run("audit-and-notify", async () => {
      if (Object.keys(changes).length === 0) return;

      await ctx.step.run(logAuditStep, {
        action: AUDIT_ACTION.PLATFORM_USER_UPDATED,
        changes,
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
      });

      await ctx.pubsub.publish(PLATFORM_USER_EVENTS.UPDATED, {
        changes,
        userId: id,
      });
    });

    return ctx.step.run(fetchUserStep, { id });
  },
);

const deleteUser = Workflow.name("user.delete").handler(
  async (input: { id: string }, ctx) => {
    if (!ctx.auth) throw new Error("Auth is required for user deletion");
    const auth = ctx.auth;
    const { id } = parse(GetInputSchema, input);

    await ctx.step.run("delete-auth-user", async () => {
      await auth.user.delete({ id });
    });

    await ctx.step.run(logAuditStep, {
      action: AUDIT_ACTION.PLATFORM_USER_DELETED,
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
    });

    await ctx.pubsub.publish(PLATFORM_USER_EVENTS.DELETED, {
      userId: id,
    });
  },
);

const assignRole = Workflow.name("user.assign-role").handler(
  async (input: { id: string; role: string }, ctx) => {
    if (!ctx.auth) throw new Error("Auth is required for role assignment");
    const auth = ctx.auth;
    const { id, role } = parse(AssignRoleInputSchema, input);

    await ctx.step.run("assign-auth-role", async () => {
      await auth.user.role.assign({
        roleName: role,
        userId: id,
      });
    });

    await ctx.step.run(logAuditStep, {
      action: AUDIT_ACTION.ROLE_ASSIGNED,
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
      newState: { role },
    });

    await ctx.pubsub.publish(PLATFORM_USER_EVENTS.ROLE_ASSIGNED, {
      role,
      userId: id,
    });
  },
);

const assignToServiceProvider = Workflow.name("user.assign-sp").handler(
  async (input: { userId: string; spId: string }, ctx) => {
    const { userId, spId } = parse(AssignSpInputSchema, input);

    await ctx.step.run("validate-sp", async () => {
      const [sp] = await ctx.db
        .select({ status: serviceProvider.status })
        .from(serviceProvider)
        .where(eq(serviceProvider.id, spId))
        .limit(1);

      if (!sp) {
        throw new Error(`Service Provider with id "${spId}" not found.`);
      }
    });

    await ctx.step.run("update-user-sp", async () => {
      await ctx.db
        .update(user)
        .set({ role: ROLES.SP_USER, spId })
        .where(eq(user.id, userId));
    });

    await ctx.step.run(logAuditStep, {
      action: AUDIT_ACTION.SP_ASSIGNED_TO_USER,
      entityId: userId,
      entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
      newState: { role: ROLES.SP_USER, spId },
    });

    await ctx.pubsub.publish(PLATFORM_USER_EVENTS.ROLE_ASSIGNED, {
      role: ROLES.SP_USER,
      userId,
    });
  },
);

export const users = {
  assignRole,
  assignToServiceProvider,
  create: createUser,
  delete: deleteUser,
  get: getUser,
  list: listUsers,
  update: updateUser,
};
