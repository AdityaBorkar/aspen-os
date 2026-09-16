import { healthcarePharmacyBatch, healthcarePharmacyItem } from "#/db-schemas/pharmacy";
import { ReorderSuggestSchema } from "#/schemas/pharmacy";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ReorderSuggestInputSchema = object({ input: ReorderSuggestSchema });

function isExpired(expiry: string): boolean {
  return new Date(expiry).getTime() < Date.now();
}

export const reorderSuggest = Workflow.name("pharmacy.reorder-suggest")
  .input(ReorderSuggestInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ReorderSuggestSchema, input);
    const branchId = parsed.branchId ?? "main";

    const rows = await ctx.step.run("compute-levels", async () => {
      const items = await ctx.db
        .select()
        .from(healthcarePharmacyItem)
        .where(eq(healthcarePharmacyItem.branch_id, branchId));
      const batches = await ctx.db
        .select()
        .from(healthcarePharmacyBatch)
        .where(eq(healthcarePharmacyBatch.branch_id, branchId));
      return items
        .map((item) => {
          const stock = batches
            .filter(
              (batch) =>
                batch.item_id === item.id &&
                !isExpired(batch.expiry) &&
                (parsed.store ? batch.location === parsed.store : true),
            )
            .reduce((sum, batch) => sum + batch.qty, 0);
          return {
            itemId: item.id,
            name: item.name,
            reorderLevel: item.reorder_level,
            salt: item.salt,
            stock,
            strength: item.strength,
          };
        })
        .filter((entry) => entry.stock <= entry.reorderLevel);
    });
    return { branchId, suggestions: rows };
  });
