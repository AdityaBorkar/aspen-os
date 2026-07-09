import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { address } from "../db-schema";
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

export class AddressWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  async create(input: CreateAddressInput) {
    const parsed = parse(CreateAddressSchema, input);

    if (parsed.isPrimary) {
      await this.unsetPrimary();
    }

    const [result] = await this.db
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
  }

  async update(id: string, patch: UpdateAddressInput) {
    await this.getById(id);
    const parsed = parse(UpdateAddressSchema, patch);

    if (parsed.isPrimary === true) {
      await this.unsetPrimary();
    }

    const [updated] = await this.db
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
      .where(eq(address.id, id))
      .returning();

    return updated;
  }

  async delete(id: string) {
    await this.db.delete(address).where(eq(address.id, id));
  }

  async getById(id: string) {
    const [result] = await this.db
      .select()
      .from(address)
      .where(eq(address.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Address with id "${id}" not found.`);
    }

    return result;
  }

  async list(filters?: AddressFilters) {
    const parsed = filters ? parse(AddressFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.country) {
      conditions.push(eq(address.country, parsed.country.toUpperCase()));
    }
    if (parsed.isPrimary !== undefined) {
      conditions.push(eq(address.isPrimary, parsed.isPrimary));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(address).where(whereClause);
  }

  async setPrimary(id: string) {
    await this.getById(id);
    await this.unsetPrimary();

    const [updated] = await this.db
      .update(address)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(address.id, id))
      .returning();

    return updated;
  }

  private async unsetPrimary(): Promise<void> {
    await this.db
      .update(address)
      .set({ isPrimary: false })
      .where(eq(address.isPrimary, true));
  }
}
