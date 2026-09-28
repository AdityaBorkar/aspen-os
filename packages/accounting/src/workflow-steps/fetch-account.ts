import { accountingAccount } from "#/db-schemas/chart";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";
import type { InferOutput } from "valibot";

const FetchInputSchema = object({ id: string() });

export type FetchInput = InferOutput<typeof FetchInputSchema>;

export const fetchAccountStep = WorkflowStep.name("accounting-fetch-account")
  .input(FetchInputSchema)
  .handler(async ({ id }, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(accountingAccount)
      .where(eq(accountingAccount.id, id))
      .limit(1);
    if (!row) {
      throw new Error(`Account "${id}" not found.`);
    }
    return row;
  });
