import { Workflow } from "@aspen-os/platform/server";
import { array, minLength, number, object, pipe, string } from "valibot";

const ReorderLevelSchema = object({
  itemId: pipe(string(), minLength(1, "itemId is required")),
  reorderLevel: number(),
  stockQty: number(),
  warehouseId: string(),
});

const InputSchema = object({
  levels: pipe(array(ReorderLevelSchema), minLength(1, "At least one level is required")),
});

export const reorderSignal = Workflow.name("accounting.purchase-order.reorder-signal")
  .input(InputSchema)
  .handler(async ({ levels }, ctx) =>
    ctx.step.run("query", async () =>
      levels
        .filter((level) => level.stockQty <= level.reorderLevel)
        .map((level) => ({
          itemId: level.itemId,
          reorderLevel: level.reorderLevel,
          shortage: level.reorderLevel - level.stockQty,
          stockQty: level.stockQty,
          warehouseId: level.warehouseId,
        })),
    ),
  );
