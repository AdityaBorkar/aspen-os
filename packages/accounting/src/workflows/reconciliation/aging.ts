import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { accountingSalesInvoice } from "#/db-schemas/sales";
import { AgingQuerySchema } from "#/schemas/payment";
import { parseMoney, todayDateOnly } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";

export interface AgingBucket {
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  partyId: string;
  total: number;
}

function bucketFor(dueDate: string | null, asOf: string): string {
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

export const agingReport = Workflow.name("accounting.reconciliation.aging")
  .input(AgingQuerySchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const asOf = input.asOf ?? todayDateOnly();
      const buckets = new Map<string, AgingBucket>();

      const ensure = (partyId: string): AgingBucket => {
        const existing = buckets.get(partyId);
        if (existing) {
          return existing;
        }
        const fresh: AgingBucket = {
          current: 0,
          days30: 0,
          days60: 0,
          days90: 0,
          over90: 0,
          partyId,
          total: 0,
        };
        buckets.set(partyId, fresh);
        return fresh;
      };

      const sales = await ctx.db.select().from(accountingSalesInvoice);
      for (const invoice of sales) {
        if (
          invoice.status === "draft" ||
          invoice.status === "cancelled" ||
          invoice.status === "paid"
        ) {
          continue;
        }
        const outstanding = parseMoney(invoice.outstanding_amount);
        if (outstanding <= 0.005) {
          continue;
        }
        const bucket = ensure(invoice.customer_id);
        const key = bucketFor(invoice.due_date, asOf);
        if (key === "current") {
          bucket.current += outstanding;
        } else if (key === "days30") {
          bucket.days30 += outstanding;
        } else if (key === "days60") {
          bucket.days60 += outstanding;
        } else if (key === "days90") {
          bucket.days90 += outstanding;
        } else {
          bucket.over90 += outstanding;
        }
        bucket.total += outstanding;
      }

      const purchases = await ctx.db.select().from(accountingPurchaseInvoice);
      for (const invoice of purchases) {
        if (
          invoice.status === "draft" ||
          invoice.status === "cancelled" ||
          invoice.status === "paid"
        ) {
          continue;
        }
        const outstanding = parseMoney(invoice.outstanding_amount);
        if (outstanding <= 0.005) {
          continue;
        }
        const bucket = ensure(invoice.supplier_id);
        const key = bucketFor(invoice.due_date, asOf);
        if (key === "current") {
          bucket.current += outstanding;
        } else if (key === "days30") {
          bucket.days30 += outstanding;
        } else if (key === "days60") {
          bucket.days60 += outstanding;
        } else if (key === "days90") {
          bucket.days90 += outstanding;
        } else {
          bucket.over90 += outstanding;
        }
        bucket.total += outstanding;
      }

      return [...buckets.values()];
    }),
  );
