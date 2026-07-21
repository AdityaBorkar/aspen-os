import type { PubSubUnit } from "@aspen-os/framework/server";
import { and, eq, ilike, or, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, SP_STATUS } from "../constants";
import { auditLog, serviceProvider, tenant, user } from "../db-schema";
import { SERVICE_PROVIDER_EVENTS } from "../event-map";
import type {
  CreateServiceProviderInput,
  ServiceProviderFilters,
  UpdateServiceProviderInput,
} from "../types";
import {
  CreateServiceProviderSchema,
  ServiceProviderFiltersSchema,
  UpdateServiceProviderSchema,
} from "../types";

type DB = NodePgDatabase<Record<string, never>>;

export class ServiceProviderWorkflow {
  constructor(
    private readonly db: DB,
    private readonly pubsub: PubSubUnit,
  ) {}

  async create(input: CreateServiceProviderInput) {
    const parsed = parse(CreateServiceProviderSchema, input);

    const [result] = await this.db
      .insert(serviceProvider)
      .values({
        address: parsed.address ?? null,
        description: parsed.description ?? null,
        email: parsed.email ?? null,
        logo: parsed.logo ?? null,
        name: parsed.name,
        phone: parsed.phone ?? null,
        slug: parsed.slug,
        website: parsed.website ?? null,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create service provider.");
    }

    await this.logAudit({
      action: AUDIT_ACTION.SP_CREATED,
      entityId: result.id,
      entityType: AUDIT_ENTITY_TYPE.SERVICE_PROVIDER,
      newState: { name: result.name, slug: result.slug, status: result.status },
    });

    await this.pubsub.publish(SERVICE_PROVIDER_EVENTS.CREATED, {
      serviceProvider: {
        id: result.id,
        name: result.name,
        slug: result.slug,
      },
    });

    return result;
  }

  async get(id: string) {
    const [result] = await this.db
      .select()
      .from(serviceProvider)
      .where(eq(serviceProvider.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Service Provider with id "${id}" not found.`);
    }

    return result;
  }

  async list(filters?: ServiceProviderFilters) {
    const parsed = filters ? parse(ServiceProviderFiltersSchema, filters) : {};
    const conditions: SQL[] = [];

    if (parsed.status) {
      conditions.push(
        eq(
          serviceProvider.status,
          parsed.status as (typeof serviceProvider.status.enumValues)[number],
        ),
      );
    }
    if (parsed.search) {
      const term = `%${parsed.search}%`;
      conditions.push(
        or(
          ilike(serviceProvider.name, term),
          ilike(serviceProvider.slug, term),
        ) as SQL,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(serviceProvider).where(whereClause);
  }

  async update(id: string, patch: UpdateServiceProviderInput) {
    await this.get(id);
    const parsed = parse(UpdateServiceProviderSchema, patch);

    const updateData: Record<string, unknown> = {};
    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.slug !== undefined) updateData.slug = parsed.slug;
    if (parsed.logo !== undefined) updateData.logo = parsed.logo;
    if (parsed.description !== undefined)
      updateData.description = parsed.description;
    if (parsed.email !== undefined) updateData.email = parsed.email;
    if (parsed.phone !== undefined) updateData.phone = parsed.phone;
    if (parsed.website !== undefined) updateData.website = parsed.website;
    if (parsed.address !== undefined) updateData.address = parsed.address;

    const [updated] = await this.db
      .update(serviceProvider)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(serviceProvider.id, id))
      .returning();

    await this.logAudit({
      action: AUDIT_ACTION.SP_UPDATED,
      changes: updateData,
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.SERVICE_PROVIDER,
    });

    await this.pubsub.publish(SERVICE_PROVIDER_EVENTS.UPDATED, {
      changes: updateData,
      serviceProvider: { id, name: updated?.name ?? "" },
    });

    return updated;
  }

  async deactivate(id: string) {
    const [updated] = await this.db
      .update(serviceProvider)
      .set({ status: SP_STATUS.INACTIVE, updatedAt: new Date() })
      .where(eq(serviceProvider.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Service Provider with id "${id}" not found.`);
    }

    await this.logAudit({
      action: AUDIT_ACTION.SP_DEACTIVATED,
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.SERVICE_PROVIDER,
      newState: { status: SP_STATUS.INACTIVE },
    });

    await this.pubsub.publish(SERVICE_PROVIDER_EVENTS.DEACTIVATED, {
      serviceProviderId: id,
    });

    return updated;
  }

  async activate(id: string) {
    const [updated] = await this.db
      .update(serviceProvider)
      .set({ status: SP_STATUS.ACTIVE, updatedAt: new Date() })
      .where(eq(serviceProvider.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Service Provider with id "${id}" not found.`);
    }

    await this.logAudit({
      action: AUDIT_ACTION.SP_ACTIVATED,
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.SERVICE_PROVIDER,
      newState: { status: SP_STATUS.ACTIVE },
    });

    await this.pubsub.publish(SERVICE_PROVIDER_EVENTS.ACTIVATED, {
      serviceProviderId: id,
    });

    return updated;
  }

  async getAssignedTenants(spId: string) {
    return this.db
      .select()
      .from(tenant)
      .where(eq(tenant.serviceProviderId, spId));
  }

  async getUsers(spId: string) {
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
      .where(eq(user.spId, spId));
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
