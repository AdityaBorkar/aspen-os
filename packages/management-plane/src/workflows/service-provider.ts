import { Workflow, WorkflowStep } from "@aspen-os/framework/server";
import { and, eq, ilike, or, type SQL } from "drizzle-orm";
import { object, optional, parse } from "valibot";

import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, SP_STATUS } from "../constants";
import { serviceProvider, tenant, user } from "../db-schemas";
import { SERVICE_PROVIDER_EVENTS } from "../event-map";
import type {
  CreateServiceProviderInput,
  ServiceProviderFilters,
  UpdateServiceProviderInput,
} from "../types";
import {
  CreateServiceProviderSchema,
  IdSchema,
  ServiceProviderFiltersSchema,
  UpdateServiceProviderSchema,
} from "../types";
import { logAuditStep } from "./steps";
import { stripUndefined } from "./utils";

const CreateInputSchema = object({
  input: CreateServiceProviderSchema,
});

const ListInputSchema = object({
  filters: optional(ServiceProviderFiltersSchema),
});

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdateServiceProviderSchema,
});

const fetchServiceProviderStep = WorkflowStep.name("fetch-sp").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(serviceProvider)
      .where(eq(serviceProvider.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Service Provider with id "${input.id}" not found.`);
    }

    return result;
  },
);

const createSp = Workflow.name("sp.create").handler(
  async (input: { input: CreateServiceProviderInput }, ctx) => {
    const { input: parsed } = parse(CreateInputSchema, input);

    const [result] = await ctx.db
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

    await ctx.step.run(logAuditStep, {
      action: AUDIT_ACTION.SP_CREATED,
      entityId: result.id,
      entityType: AUDIT_ENTITY_TYPE.SERVICE_PROVIDER,
      newState: { name: result.name, slug: result.slug, status: result.status },
    });

    await ctx.pubsub.publish(SERVICE_PROVIDER_EVENTS.CREATED, {
      serviceProvider: {
        id: result.id,
        name: result.name,
        slug: result.slug,
      },
    });

    return result;
  },
);

const getSp = Workflow.name("sp.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchServiceProviderStep, { id: input.id });
  },
);

const listSps = Workflow.name("sp.list").handler(
  async (input: { filters?: ServiceProviderFilters }, ctx) => {
    return ctx.step.run("query", async () => {
      const { filters } = parse(ListInputSchema, input);
      const parsed = filters
        ? parse(ServiceProviderFiltersSchema, filters)
        : {};
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

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.select().from(serviceProvider).where(whereClause);
    });
  },
);

const updateSp = Workflow.name("sp.update").handler(
  async (input: { id: string; patch: UpdateServiceProviderInput }, ctx) => {
    const { id, patch } = parse(UpdateInputSchema, input);
    await ctx.step.run(fetchServiceProviderStep, { id });

    const data = stripUndefined(patch);
    if (Object.keys(data).length === 0)
      return ctx.step.run(fetchServiceProviderStep, { id });

    await ctx.step.run("update-record", async () => {
      await ctx.db
        .update(serviceProvider)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(serviceProvider.id, id));
    });

    await ctx.step.run(logAuditStep, {
      action: AUDIT_ACTION.SP_UPDATED,
      changes: data,
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.SERVICE_PROVIDER,
    });

    await ctx.pubsub.publish(SERVICE_PROVIDER_EVENTS.UPDATED, {
      changes: data,
      serviceProvider: { id, name: (data.name as string) ?? "" },
    });

    return ctx.step.run(fetchServiceProviderStep, { id });
  },
);

const deactivateSp = Workflow.name("sp.deactivate").handler(
  async (input: { id: string }, ctx) => {
    const id = parse(IdSchema, input.id);

    const [updated] = await ctx.db
      .update(serviceProvider)
      .set({ status: SP_STATUS.INACTIVE, updatedAt: new Date() })
      .where(eq(serviceProvider.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Service Provider with id "${id}" not found.`);
    }

    await ctx.step.run(logAuditStep, {
      action: AUDIT_ACTION.SP_DEACTIVATED,
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.SERVICE_PROVIDER,
      newState: { status: SP_STATUS.INACTIVE },
    });

    await ctx.pubsub.publish(SERVICE_PROVIDER_EVENTS.DEACTIVATED, {
      serviceProviderId: id,
    });

    return updated;
  },
);

const activateSp = Workflow.name("sp.activate").handler(
  async (input: { id: string }, ctx) => {
    const id = parse(IdSchema, input.id);

    const [updated] = await ctx.db
      .update(serviceProvider)
      .set({ status: SP_STATUS.ACTIVE, updatedAt: new Date() })
      .where(eq(serviceProvider.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Service Provider with id "${id}" not found.`);
    }

    await ctx.step.run(logAuditStep, {
      action: AUDIT_ACTION.SP_ACTIVATED,
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.SERVICE_PROVIDER,
      newState: { status: SP_STATUS.ACTIVE },
    });

    await ctx.pubsub.publish(SERVICE_PROVIDER_EVENTS.ACTIVATED, {
      serviceProviderId: id,
    });

    return updated;
  },
);

const getAssignedTenants = Workflow.name("sp.assigned-tenants").handler(
  async (input: { spId: string }, ctx) => {
    const parsedSpId = parse(IdSchema, input.spId);

    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(tenant)
        .where(eq(tenant.serviceProviderId, parsedSpId));
    });
  },
);

const getUsers = Workflow.name("sp.users").handler(
  async (input: { spId: string }, ctx) => {
    const parsedSpId = parse(IdSchema, input.spId);

    return ctx.step.run("query", async () => {
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
        .where(eq(user.spId, parsedSpId));
    });
  },
);

export const serviceProviders = {
  activate: activateSp,
  create: createSp,
  deactivate: deactivateSp,
  get: getSp,
  getAssignedTenants,
  getUsers,
  list: listSps,
  update: updateSp,
};
