import { accountingDeliveryItem, accountingDeliveryNote } from "#/db-schemas/sales";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getDeliveryNote = Workflow.name("accounting.delivery.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [note] = await ctx.db
      .select()
      .from(accountingDeliveryNote)
      .where(eq(accountingDeliveryNote.id, id))
      .limit(1);
    if (!note) {
      throw new Error(`Delivery note "${id}" not found.`);
    }
    const items = await ctx.db
      .select()
      .from(accountingDeliveryItem)
      .where(eq(accountingDeliveryItem.delivery_id, id));
    return { items, note };
  });
