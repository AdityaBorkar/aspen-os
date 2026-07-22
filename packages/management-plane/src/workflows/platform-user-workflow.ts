import type { AuthUnit, PubSubUnit } from "@aspen-os/framework/server";
import { and, eq, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, ROLES } from "../constants";
import { auditLog, serviceProvider, user } from "../db-schema";
import { PLATFORM_USER_EVENTS } from "../event-map";
import type {
  CreatePlatformUserInput,
  PlatformUserFilters,
  UpdatePlatformUserInput,
} from "../types";
import {
  CreatePlatformUserSchema,
  PlatformUserFiltersSchema,
  UpdatePlatformUserSchema,
} from "../types";

type DB = NodePgDatabase<Record<string, never>>;

export class PlatformUserWorkflow {
  constructor(
    private readonly db: DB,
    private readonly auth: AuthUnit,
    private readonly pubsub: PubSubUnit,
  ) {}

  async create(input: CreatePlatformUserInput) {
    const parsed = parse(CreatePlatformUserSchema, input);

    if (parsed.role === ROLES.SP_USER && !parsed.spId) {
      throw new Error("spId is required when role is 'sp_user'.");
    }
    if (parsed.role !== ROLES.SP_USER && parsed.spId) {
      throw new Error("spId must not be set when role is not 'sp_user'.");
    }

    if (parsed.spId) {
      const [sp] = await this.db
        .select({ status: serviceProvider.status })
        .from(serviceProvider)
        .where(eq(serviceProvider.id, parsed.spId))
        .limit(1);

      if (!sp) {
        throw new Error(`Service Provider with id "${parsed.spId}" not found.`);
      }
    }

    const api = this.auth.api as unknown as {
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
      await this.db
        .update(user)
        .set({ spId: parsed.spId })
        .where(eq(user.id, createdUser.id));
    }

    await this.logAudit({
      action: AUDIT_ACTION.PLATFORM_USER_CREATED,
      entityId: createdUser.id,
      entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
      newState: {
        email: createdUser.email,
        role: parsed.role,
        spId: parsed.spId ?? null,
      },
    });

    await this.pubsub.publish(PLATFORM_USER_EVENTS.CREATED, {
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
  }

  async get(id: string) {
    const [result] = await this.db
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
      .where(eq(user.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Platform user with id "${id}" not found.`);
    }

    return result;
  }

  async list(filters?: PlatformUserFilters) {
    const parsed = filters ? parse(PlatformUserFiltersSchema, filters) : {};
    const conditions: SQL[] = [];

    if (parsed.role) {
      conditions.push(eq(user.role, parsed.role));
    }
    if (parsed.spId) {
      conditions.push(eq(user.spId, parsed.spId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db
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
  }

  async update(id: string, patch: UpdatePlatformUserInput) {
    const parsed = parse(UpdatePlatformUserSchema, patch);

    if (parsed.role === ROLES.SP_USER && parsed.spId === null) {
      throw new Error("spId is required when role is 'sp_user'.");
    }
    if (
      parsed.role !== undefined &&
      parsed.role !== ROLES.SP_USER &&
      parsed.spId
    ) {
      throw new Error("spId must not be set when role is not 'sp_user'.");
    }

    if (parsed.spId) {
      const [sp] = await this.db
        .select({ status: serviceProvider.status })
        .from(serviceProvider)
        .where(eq(serviceProvider.id, parsed.spId))
        .limit(1);

      if (!sp) {
        throw new Error(`Service Provider with id "${parsed.spId}" not found.`);
      }
    }

    const changes: Record<string, unknown> = {};

    if (parsed.name !== undefined || parsed.role !== undefined) {
      const updateData: { name?: string; role?: string } = {};
      if (parsed.name !== undefined) {
        updateData.name = parsed.name;
        changes.name = parsed.name;
      }
      if (parsed.role !== undefined) {
        updateData.role = parsed.role;
        changes.role = parsed.role;
      }

      await this.auth.user.update({
        data: updateData,
        id,
      });
    }

    if (parsed.spId !== undefined) {
      await this.db
        .update(user)
        .set({ spId: parsed.spId })
        .where(eq(user.id, id));
      changes.spId = parsed.spId;
    }

    await this.logAudit({
      action: AUDIT_ACTION.PLATFORM_USER_UPDATED,
      changes,
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
    });

    await this.pubsub.publish(PLATFORM_USER_EVENTS.UPDATED, {
      changes,
      userId: id,
    });

    return this.get(id);
  }

  async delete(id: string) {
    await this.auth.user.delete({ id });

    await this.logAudit({
      action: AUDIT_ACTION.PLATFORM_USER_DELETED,
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
    });

    await this.pubsub.publish(PLATFORM_USER_EVENTS.DELETED, {
      userId: id,
    });
  }

  async assignRole(id: string, role: string) {
    await this.auth.user.role.assign({ roleName: role, userId: id });

    await this.logAudit({
      action: AUDIT_ACTION.ROLE_ASSIGNED,
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
      newState: { role },
    });

    await this.pubsub.publish(PLATFORM_USER_EVENTS.ROLE_ASSIGNED, {
      role,
      userId: id,
    });
  }

  async assignToServiceProvider(userId: string, spId: string) {
    const [sp] = await this.db
      .select({ status: serviceProvider.status })
      .from(serviceProvider)
      .where(eq(serviceProvider.id, spId))
      .limit(1);

    if (!sp) {
      throw new Error(`Service Provider with id "${spId}" not found.`);
    }

    await this.db
      .update(user)
      .set({ role: ROLES.SP_USER, spId })
      .where(eq(user.id, userId));

    await this.logAudit({
      action: AUDIT_ACTION.SP_ASSIGNED_TO_USER,
      entityId: userId,
      entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
      newState: { role: ROLES.SP_USER, spId },
    });

    await this.pubsub.publish(PLATFORM_USER_EVENTS.ROLE_ASSIGNED, {
      role: ROLES.SP_USER,
      userId,
    });
  }

  private async logAudit(input: {
    action: (typeof auditLog.action.enumValues)[number];
    changes?: Record<string, unknown>;
    entityId: string;
    entityType: (typeof auditLog.entityType.enumValues)[number];
    newState?: Record<string, unknown>;
    previousState?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.insert(auditLog).values({
      action: input.action,
      actorId: "system",
      changes: input.changes ?? null,
      entityId: input.entityId,
      entityType: input.entityType,
      newState: input.newState ?? null,
      previousState: input.previousState ?? null,
    });
  }
}
