import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { bankAccount } from "../db-schema";
import type {
  BankAccountFilters,
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from "../types";
import {
  BankAccountFiltersSchema,
  CreateBankAccountSchema,
  UpdateBankAccountSchema,
} from "../types";

export class BankAccountWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  async create(input: CreateBankAccountInput) {
    const parsed = parse(CreateBankAccountSchema, input);

    if (parsed.isPrimary) {
      await this.unsetPrimary();
    }

    const [result] = await this.db
      .insert(bankAccount)
      .values({
        accountHolderName: parsed.accountHolderName,
        accountNumber: parsed.accountNumber,
        accountType: parsed.accountType ?? null,
        bankName: parsed.bankName,
        branchName: parsed.branchName ?? null,
        currency: parsed.currency ?? "USD",
        isActive: parsed.isActive ?? true,
        isPrimary: parsed.isPrimary ?? false,
        metadata: parsed.metadata ?? null,
        routingNumber: parsed.routingNumber ?? null,
        swiftCode: parsed.swiftCode ?? null,
      })
      .returning();

    return result;
  }

  async update(id: string, patch: UpdateBankAccountInput) {
    await this.getById(id);
    const parsed = parse(UpdateBankAccountSchema, patch);

    if (parsed.isPrimary === true) {
      await this.unsetPrimary();
    }

    const [updated] = await this.db
      .update(bankAccount)
      .set({
        accountHolderName: parsed.accountHolderName,
        accountNumber: parsed.accountNumber,
        accountType: parsed.accountType,
        bankName: parsed.bankName,
        branchName: parsed.branchName,
        currency: parsed.currency,
        isActive: parsed.isActive,
        isPrimary: parsed.isPrimary,
        metadata: parsed.metadata,
        routingNumber: parsed.routingNumber,
        swiftCode: parsed.swiftCode,
        updatedAt: new Date(),
      })
      .where(eq(bankAccount.id, id))
      .returning();

    return updated;
  }

  async delete(id: string) {
    await this.db.delete(bankAccount).where(eq(bankAccount.id, id));
  }

  async getById(id: string) {
    const [result] = await this.db
      .select()
      .from(bankAccount)
      .where(eq(bankAccount.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Bank account with id "${id}" not found.`);
    }

    return result;
  }

  async list(filters?: BankAccountFilters) {
    const parsed = filters ? parse(BankAccountFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.currency) {
      conditions.push(eq(bankAccount.currency, parsed.currency));
    }
    if (parsed.isActive !== undefined) {
      conditions.push(eq(bankAccount.isActive, parsed.isActive));
    }
    if (parsed.isPrimary !== undefined) {
      conditions.push(eq(bankAccount.isPrimary, parsed.isPrimary));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(bankAccount).where(whereClause);
  }

  async setPrimary(id: string) {
    await this.getById(id);
    await this.unsetPrimary();

    const [updated] = await this.db
      .update(bankAccount)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(bankAccount.id, id))
      .returning();

    return updated;
  }

  async deactivate(id: string) {
    const [updated] = await this.db
      .update(bankAccount)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(bankAccount.id, id))
      .returning();

    return updated;
  }

  async activate(id: string) {
    const [updated] = await this.db
      .update(bankAccount)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(bankAccount.id, id))
      .returning();

    return updated;
  }

  private async unsetPrimary(): Promise<void> {
    await this.db
      .update(bankAccount)
      .set({ isPrimary: false })
      .where(eq(bankAccount.isPrimary, true));
  }
}
