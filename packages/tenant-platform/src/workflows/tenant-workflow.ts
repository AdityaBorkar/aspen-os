import type { AuthUnit, PubSubUnit } from "@aspen-os/framework/server";
import { and, eq, ilike, or, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, TENANT_STATUS } from "../constants";
import {
  auditLog,
  member,
  organization,
  serviceProvider,
  tenant,
} from "../db-schema";
import { TENANT_EVENTS } from "../event-map";
import type {
  ProvisionTenantInput,
  TenantFilters,
  UpdateTenantCompanionInput,
  UpdateTenantProfileInput,
} from "../types";
import {
  ProvisionTenantSchema,
  TenantFiltersSchema,
  UpdateTenantCompanionSchema,
  UpdateTenantProfileSchema,
} from "../types";
import type { ProvisioningWorkflow } from "./provisioning-workflow";

type DB = NodePgDatabase<Record<string, never>>;

type AuthApi = {
  createInvitation: (opts: unknown) => Promise<unknown>;
  getFullOrganization: (opts: unknown) => Promise<unknown>;
  removeMember: (opts: unknown) => Promise<unknown>;
};

export class TenantWorkflow {
  constructor(
    private readonly db: DB,
    private readonly auth: AuthUnit,
    private readonly pubsub: PubSubUnit,
    private readonly provisioning: ProvisioningWorkflow,
  ) {}

  async provision(
    input: ProvisionTenantInput,
    userId: string,
  ): Promise<{ tenantId: string }> {
    const parsed = parse(ProvisionTenantSchema, input);
    return this.provisioning.provision(parsed, userId);
  }

  async get(id: string) {
    const [org] = await this.db
      .select()
      .from(organization)
      .where(eq(organization.id, id))
      .limit(1);

    if (!org) {
      throw new Error(`Tenant with id "${id}" not found.`);
    }

    const [companion] = await this.db
      .select()
      .from(tenant)
      .where(eq(tenant.id, id))
      .limit(1);

    return { ...org, ...companion };
  }

  async list(filters?: TenantFilters) {
    const parsed = filters ? parse(TenantFiltersSchema, filters) : {};
    const conditions: SQL[] = [];

    if (parsed.status) {
      conditions.push(
        eq(
          tenant.status,
          parsed.status as (typeof tenant.status.enumValues)[number],
        ),
      );
    }
    if (parsed.plan) {
      conditions.push(eq(tenant.plan, parsed.plan));
    }
    if (parsed.serviceProviderId) {
      conditions.push(eq(tenant.serviceProviderId, parsed.serviceProviderId));
    }
    if (parsed.search) {
      const term = `%${parsed.search}%`;
      conditions.push(
        or(
          ilike(organization.name, term),
          ilike(organization.slug, term),
        ) as SQL,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db
      .select({
        createdAt: organization.createdAt,
        id: organization.id,
        logo: organization.logo,
        name: organization.name,
        plan: tenant.plan,
        serviceProviderId: tenant.serviceProviderId,
        signupAt: tenant.signupAt,
        slug: organization.slug,
        status: tenant.status,
      })
      .from(tenant)
      .leftJoin(organization, eq(organization.id, tenant.id))
      .where(whereClause);
  }

  async updateProfile(id: string, patch: UpdateTenantProfileInput) {
    const parsed = parse(UpdateTenantProfileSchema, patch);

    const updateData: Record<string, unknown> = {};
    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.slug !== undefined) updateData.slug = parsed.slug;
    if (parsed.logo !== undefined) updateData.logo = parsed.logo;

    const [updated] = await this.db
      .update(organization)
      .set(updateData)
      .where(eq(organization.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Tenant with id "${id}" not found.`);
    }

    await this.logAudit({
      action: AUDIT_ACTION.TENANT_PROFILE_UPDATED,
      changes: updateData,
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.TENANT,
    });

    await this.pubsub.publish(TENANT_EVENTS.PROFILE_UPDATED, {
      changes: updateData,
      tenantId: id,
    });

    return updated;
  }

  async updateCompanion(id: string, patch: UpdateTenantCompanionInput) {
    const parsed = parse(UpdateTenantCompanionSchema, patch);

    const updateData: Record<string, unknown> = {};
    if (parsed.plan !== undefined) updateData.plan = parsed.plan;
    if (parsed.status !== undefined) updateData.status = parsed.status;

    const [updated] = await this.db
      .update(tenant)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(tenant.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Tenant with id "${id}" not found.`);
    }

    return updated;
  }

  async assignServiceProvider(tenantId: string, spId: string) {
    const [sp] = await this.db
      .select({ status: serviceProvider.status })
      .from(serviceProvider)
      .where(eq(serviceProvider.id, spId))
      .limit(1);

    if (!sp) {
      throw new Error(`Service Provider with id "${spId}" not found.`);
    }
    if (sp.status !== "active") {
      throw new Error(
        `Service Provider "${spId}" is not active and cannot be assigned.`,
      );
    }

    const [updated] = await this.db
      .update(tenant)
      .set({ serviceProviderId: spId, updatedAt: new Date() })
      .where(eq(tenant.id, tenantId))
      .returning();

    if (!updated) {
      throw new Error(`Tenant with id "${tenantId}" not found.`);
    }

    await this.logAudit({
      action: AUDIT_ACTION.SP_ASSIGNED,
      entityId: tenantId,
      entityType: AUDIT_ENTITY_TYPE.TENANT,
      newState: { serviceProviderId: spId },
    });

    await this.pubsub.publish(TENANT_EVENTS.SP_ASSIGNED, {
      serviceProviderId: spId,
      tenantId,
    });

    return updated;
  }

  async unassignServiceProvider(tenantId: string) {
    const [updated] = await this.db
      .update(tenant)
      .set({ serviceProviderId: null, updatedAt: new Date() })
      .where(eq(tenant.id, tenantId))
      .returning();

    if (!updated) {
      throw new Error(`Tenant with id "${tenantId}" not found.`);
    }

    await this.logAudit({
      action: AUDIT_ACTION.SP_UNASSIGNED,
      entityId: tenantId,
      entityType: AUDIT_ENTITY_TYPE.TENANT,
    });

    await this.pubsub.publish(TENANT_EVENTS.SP_UNASSIGNED, {
      tenantId,
    });

    return updated;
  }

  async suspend(tenantId: string, reason: string) {
    const current = await this.getCompanion(tenantId);
    if (current.status !== TENANT_STATUS.ACTIVE) {
      throw new Error(
        `Cannot suspend tenant in "${current.status}" status. Must be "active".`,
      );
    }

    const [updated] = await this.db
      .update(tenant)
      .set({
        status: TENANT_STATUS.SUSPENDED,
        suspendedAt: new Date(),
        suspendedReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(tenant.id, tenantId))
      .returning();

    await this.logAudit({
      action: AUDIT_ACTION.TENANT_SUSPENDED,
      entityId: tenantId,
      entityType: AUDIT_ENTITY_TYPE.TENANT,
      newState: { reason, status: TENANT_STATUS.SUSPENDED },
      previousState: { status: current.status },
    });

    await this.pubsub.publish(TENANT_EVENTS.SUSPENDED, {
      reason,
      tenantId,
    });

    return updated;
  }

  async reactivate(tenantId: string) {
    const current = await this.getCompanion(tenantId);
    if (current.status !== TENANT_STATUS.SUSPENDED) {
      throw new Error(
        `Cannot reactivate tenant in "${current.status}" status. Must be "suspended".`,
      );
    }

    const [updated] = await this.db
      .update(tenant)
      .set({
        status: TENANT_STATUS.ACTIVE,
        updatedAt: new Date(),
      })
      .where(eq(tenant.id, tenantId))
      .returning();

    await this.logAudit({
      action: AUDIT_ACTION.TENANT_REACTIVATED,
      entityId: tenantId,
      entityType: AUDIT_ENTITY_TYPE.TENANT,
      newState: { status: TENANT_STATUS.ACTIVE },
      previousState: { status: current.status },
    });

    await this.pubsub.publish(TENANT_EVENTS.REACTIVATED, {
      tenantId,
    });

    return updated;
  }

  async churn(tenantId: string, reason: string) {
    const current = await this.getCompanion(tenantId);
    if (
      current.status !== TENANT_STATUS.ACTIVE &&
      current.status !== TENANT_STATUS.SUSPENDED
    ) {
      throw new Error(
        `Cannot churn tenant in "${current.status}" status. Must be "active" or "suspended".`,
      );
    }

    const [updated] = await this.db
      .update(tenant)
      .set({
        churnedAt: new Date(),
        churnReason: reason,
        status: TENANT_STATUS.CHURNED,
        updatedAt: new Date(),
      })
      .where(eq(tenant.id, tenantId))
      .returning();

    await this.logAudit({
      action: AUDIT_ACTION.TENANT_CHURNED,
      entityId: tenantId,
      entityType: AUDIT_ENTITY_TYPE.TENANT,
      newState: { reason, status: TENANT_STATUS.CHURNED },
      previousState: { status: current.status },
    });

    await this.pubsub.publish(TENANT_EVENTS.CHURNED, {
      reason,
      tenantId,
    });

    return updated;
  }

  async activate(tenantId: string) {
    const current = await this.getCompanion(tenantId);
    if (current.status !== TENANT_STATUS.ONBOARDING) {
      throw new Error(
        `Cannot activate tenant in "${current.status}" status. Must be "onboarding".`,
      );
    }

    const [updated] = await this.db
      .update(tenant)
      .set({
        status: TENANT_STATUS.ACTIVE,
        updatedAt: new Date(),
      })
      .where(eq(tenant.id, tenantId))
      .returning();

    await this.logAudit({
      action: AUDIT_ACTION.TENANT_ACTIVATED,
      entityId: tenantId,
      entityType: AUDIT_ENTITY_TYPE.TENANT,
      newState: { status: TENANT_STATUS.ACTIVE },
      previousState: { status: current.status },
    });

    await this.pubsub.publish(TENANT_EVENTS.ACTIVATED, {
      tenantId,
    });

    return updated;
  }

  async getMembers(tenantId: string, headers: Headers) {
    const api = this.auth.api as unknown as AuthApi;
    const response = (await api.getFullOrganization({
      headers,
      params: { organizationId: tenantId },
    } as Record<string, unknown>)) as { members?: unknown[] };

    return response.members ?? [];
  }

  async inviteMember(
    tenantId: string,
    email: string,
    memberRole: string,
    headers: Headers,
  ) {
    const api = this.auth.api as unknown as AuthApi;
    return api.createInvitation({
      body: {
        email,
        organizationId: tenantId,
        role: memberRole,
      },
      headers,
    } as Record<string, unknown>);
  }

  async removeMember(
    tenantId: string,
    memberIdOrEmail: string,
    headers: Headers,
  ) {
    const api = this.auth.api as unknown as AuthApi;
    return api.removeMember({
      body: {
        memberIdOrEmail,
        organizationId: tenantId,
      },
      headers,
    } as Record<string, unknown>);
  }

  async getMemberCount(tenantId: string): Promise<number> {
    const rows = await this.db
      .select({ id: member.id })
      .from(member)
      .where(eq(member.organizationId, tenantId));
    return rows.length;
  }

  private async getCompanion(tenantId: string) {
    const [companion] = await this.db
      .select()
      .from(tenant)
      .where(eq(tenant.id, tenantId))
      .limit(1);

    if (!companion) {
      throw new Error(`Tenant with id "${tenantId}" not found.`);
    }
    return companion;
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
