import { healthcarePharmacyBatch, healthcarePharmacyItem } from "#/db-schemas/pharmacy";
import { ExpiryAlertQuerySchema } from "#/schemas/pharmacy";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ExpiryAlertInputSchema = object({ input: ExpiryAlertQuerySchema });

export const expiryAlerts = Workflow.name("healthcare.pharmacy.expiry-alerts")
  .input(ExpiryAlertInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ExpiryAlertQuerySchema, input);
    const branchId = parsed.branchId ?? "main";
    const withinDays = parsed.withinDays ?? 90;
    const cutoff = Date.now() + withinDays * 86_400_000;

    const [batches, items] = await ctx.step.run("load-batches", async () =>
      Promise.all([
        ctx.db
          .select()
          .from(healthcarePharmacyBatch)
          .where(eq(healthcarePharmacyBatch.branch_id, branchId))
          .limit(2000),
        ctx.db
          .select()
          .from(healthcarePharmacyItem)
          .where(eq(healthcarePharmacyItem.branch_id, branchId))
          .limit(2000),
      ]),
    );
    const names = new Map(items.map((item) => [item.id, item]));
    const alerts = [];
    for (const batch of batches) {
      if (parsed.store && batch.location !== parsed.store) {
        continue;
      }
      if (batch.qty <= 0 || batch.status === "quarantined") {
        continue;
      }
      const expiryMs = new Date(batch.expiry).getTime();
      if (Number.isNaN(expiryMs) || expiryMs > cutoff) {
        continue;
      }
      const daysLeft = Math.floor((expiryMs - Date.now()) / 86_400_000);
      const item = names.get(batch.item_id);
      alerts.push({
        batchId: batch.id,
        daysLeft,
        expired: daysLeft < 0,
        expiry: batch.expiry,
        itemId: batch.item_id,
        itemName: item?.name ?? batch.item_id,
        lot: batch.lot,
        qty: batch.qty,
        salt: item?.salt ?? null,
        status: batch.status,
        store: batch.location,
      });
    }
    alerts.sort((a, b) => a.daysLeft - b.daysLeft);
    return { alerts, asOf: new Date().toISOString(), withinDays };
  });
