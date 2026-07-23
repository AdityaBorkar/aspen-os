import { Workflow, WorkflowStep } from "@aspen-os/framework/server";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { object, parse } from "valibot";

import { bankAccount } from "../db-schemas";
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

type DrizzleDB = NodePgDatabase<Record<string, never>>;

const CreateInputSchema = object({ input: CreateBankAccountSchema });

const fetchBankAccountStep = WorkflowStep.name("fetch-bank-account").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(bankAccount)
      .where(eq(bankAccount.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Bank account with id "${input.id}" not found.`);
    }

    return result;
  },
);

async function unsetPrimary(db: DrizzleDB): Promise<void> {
  await db
    .update(bankAccount)
    .set({ isPrimary: false })
    .where(eq(bankAccount.isPrimary, true));
}

const createBankAccount = Workflow.name("bank-account.create").handler(
  async (input: { input: CreateBankAccountInput }, ctx) => {
    const { input: parsed } = parse(CreateInputSchema, input);

    if (parsed.isPrimary) {
      await unsetPrimary(ctx.db);
    }

    const [result] = await ctx.db
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
  },
);

const getBankAccount = Workflow.name("bank-account.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchBankAccountStep, { id: input.id });
  },
);

const updateBankAccount = Workflow.name("bank-account.update").handler(
  async (input: { id: string; patch: UpdateBankAccountInput }, ctx) => {
    await ctx.step.run(fetchBankAccountStep, { id: input.id });
    const parsed = parse(UpdateBankAccountSchema, input.patch);

    if (parsed.isPrimary === true) {
      await unsetPrimary(ctx.db);
    }

    const [updated] = await ctx.db
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
      .where(eq(bankAccount.id, input.id))
      .returning();

    return updated;
  },
);

const deleteBankAccount = Workflow.name("bank-account.delete").handler(
  async (input: { id: string }, ctx) => {
    await ctx.db.delete(bankAccount).where(eq(bankAccount.id, input.id));
  },
);

const listBankAccounts = Workflow.name("bank-account.list").handler(
  async (input: { filters?: BankAccountFilters }, ctx) => {
    return ctx.step.run("query", async () => {
      const parsed = input.filters
        ? parse(BankAccountFiltersSchema, input.filters)
        : {};
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

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.select().from(bankAccount).where(whereClause);
    });
  },
);

const setPrimary = Workflow.name("bank-account.set-primary").handler(
  async (input: { id: string }, ctx) => {
    await ctx.step.run(fetchBankAccountStep, { id: input.id });
    await unsetPrimary(ctx.db);

    const [updated] = await ctx.db
      .update(bankAccount)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(bankAccount.id, input.id))
      .returning();

    return updated;
  },
);

const deactivateBankAccount = Workflow.name("bank-account.deactivate").handler(
  async (input: { id: string }, ctx) => {
    const [updated] = await ctx.db
      .update(bankAccount)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(bankAccount.id, input.id))
      .returning();

    return updated;
  },
);

const activateBankAccount = Workflow.name("bank-account.activate").handler(
  async (input: { id: string }, ctx) => {
    const [updated] = await ctx.db
      .update(bankAccount)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(bankAccount.id, input.id))
      .returning();

    return updated;
  },
);

export const bankAccounts = {
  activate: activateBankAccount,
  create: createBankAccount,
  deactivate: deactivateBankAccount,
  delete: deleteBankAccount,
  get: getBankAccount,
  list: listBankAccounts,
  setPrimary,
  update: updateBankAccount,
};
