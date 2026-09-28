import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { accountingSalesInvoice } from "#/db-schemas/sales";
import { AgingQuerySchema } from "#/schemas/payment";
import { GL_TOLERANCE, parseMoney, roundMoney, todayDateOnly } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, gt, notInArray } from "drizzle-orm";

export interface AgingBucket {
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  partyId: string;
  total: number;
}

const OPEN_STATUSES = ["draft", "cancelled", "paid"] as const;

function bucketFor(
  dueDate: string | null,
  asOf: string,
): keyof Omit<AgingBucket, "partyId" | "total"> {
  if (!dueDate || dueDate >= asOf) {
    return "current";
  }
  const due = new Date(`${dueDate}T00:00:00.000Z`).getTime();
  const now = new Date(`${asOf}T00:00:00.000Z`).getTime();
  const days = Math.floor((now - due) / 86_400_000);
  if (days <= 30) {
    return "days30";
  }
  if (days <= 60) {
    return "days60";
  }
  if (days <= 90) {
    return "days90";
  }
  return "over90";
}

function accumulate(
  buckets: Map<string, AgingBucket>,
  partyId: string,
  dueDate: string | null,
  outstanding: number,
  asOf: string,
): void {
  if (outstanding <= GL_TOLERANCE) {
    return;
  }
  let bucket = buckets.get(partyId);
  if (!bucket) {
    bucket = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, partyId, total: 0 };
    buckets.set(partyId, bucket);
  }
  const key = bucketFor(dueDate, asOf);
  bucket[key] = roundMoney(bucket[key] + outstanding);
  bucket.total = roundMoney(bucket.total + outstanding);
}

export const agingReport = Workflow.name("accounting.reconciliation.aging")
  .input(AgingQuerySchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const asOf = input.asOf ?? todayDateOnly();
      const buckets = new Map<string, AgingBucket>();

      const sales = await ctx.db
        .select()
        .from(accountingSalesInvoice)
        .where(
          and(
            notInArray(accountingSalesInvoice.status, [...OPEN_STATUSES]),
            gt(accountingSalesInvoice.outstanding_amount, "0"),
          ),
        );
      for (const invoice of sales) {
        accumulate(
          buckets,
          invoice.customer_id,
          invoice.due_date,
          parseMoney(invoice.outstanding_amount),
          asOf,
        );
      }

      const purchases = await ctx.db
        .select()
        .from(accountingPurchaseInvoice)
        .where(
          and(
            notInArray(accountingPurchaseInvoice.status, [...OPEN_STATUSES]),
            gt(accountingPurchaseInvoice.outstanding_amount, "0"),
          ),
        );
      for (const invoice of purchases) {
        accumulate(
          buckets,
          invoice.supplier_id,
          invoice.due_date,
          parseMoney(invoice.outstanding_amount),
          asOf,
        );
      }

      return [...buckets.values()];
    }),
  );
