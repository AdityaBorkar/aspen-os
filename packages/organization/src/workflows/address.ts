import { Workflow, WorkflowStep } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { object, parse } from "valibot";

import { address } from "../db-schemas";
import type {
  AddressFilters,
  CreateAddressInput,
  UpdateAddressInput,
} from "../types";
import {
  AddressFiltersSchema,
  CreateAddressSchema,
  UpdateAddressSchema,
} from "../types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

const CreateInputSchema = object({ input: CreateAddressSchema });

const fetchAddressStep = WorkflowStep.name("fetch-address").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(address)
      .where(eq(address.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Address with id "${input.id}" not found.`);
    }

    return result;
  },
);

async function unsetPrimary(db: DrizzleDB): Promise<void> {
  await db
    .update(address)
    .set({ isPrimary: false })
    .where(eq(address.isPrimary, true));
}

const createAddress = Workflow.name("address.create").handler(
  async (input: { input: CreateAddressInput }, ctx) => {
    const { input: parsed } = parse(CreateInputSchema, input);

    if (parsed.isPrimary) {
      await unsetPrimary(ctx.db);
    }

    const [result] = await ctx.db
      .insert(address)
      .values({
        city: parsed.city ?? null,
        country: parsed.country.toUpperCase(),
        isPrimary: parsed.isPrimary ?? false,
        label: parsed.label ?? null,
        line1: parsed.line1,
        line2: parsed.line2 ?? null,
        metadata: parsed.metadata ?? null,
        postalCode: parsed.postalCode ?? null,
        state: parsed.state ?? null,
      })
      .returning();

    return result;
  },
);

const getAddress = Workflow.name("address.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchAddressStep, { id: input.id });
  },
);

const updateAddress = Workflow.name("address.update").handler(
  async (input: { id: string; patch: UpdateAddressInput }, ctx) => {
    await ctx.step.run(fetchAddressStep, { id: input.id });
    const parsed = parse(UpdateAddressSchema, input.patch);

    if (parsed.isPrimary === true) {
      await unsetPrimary(ctx.db);
    }

    const [updated] = await ctx.db
      .update(address)
      .set({
        city: parsed.city,
        country: parsed.country?.toUpperCase(),
        isPrimary: parsed.isPrimary,
        label: parsed.label,
        line1: parsed.line1,
        line2: parsed.line2,
        metadata: parsed.metadata,
        postalCode: parsed.postalCode,
        state: parsed.state,
        updatedAt: new Date(),
      })
      .where(eq(address.id, input.id))
      .returning();

    return updated;
  },
);

const deleteAddress = Workflow.name("address.delete").handler(
  async (input: { id: string }, ctx) => {
    await ctx.db.delete(address).where(eq(address.id, input.id));
  },
);

const listAddresses = Workflow.name("address.list").handler(
  async (input: { filters?: AddressFilters }, ctx) => {
    return ctx.step.run("query", async () => {
      const parsed = input.filters
        ? parse(AddressFiltersSchema, input.filters)
        : {};
      const conditions = [];

      if (parsed.country) {
        conditions.push(eq(address.country, parsed.country.toUpperCase()));
      }
      if (parsed.isPrimary !== undefined) {
        conditions.push(eq(address.isPrimary, parsed.isPrimary));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.select().from(address).where(whereClause);
    });
  },
);

const setPrimary = Workflow.name("address.set-primary").handler(
  async (input: { id: string }, ctx) => {
    await ctx.step.run(fetchAddressStep, { id: input.id });
    await unsetPrimary(ctx.db);

    const [updated] = await ctx.db
      .update(address)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(address.id, input.id))
      .returning();

    return updated;
  },
);

export const addresses = {
  create: createAddress,
  delete: deleteAddress,
  get: getAddress,
  list: listAddresses,
  setPrimary,
  update: updateAddress,
};
