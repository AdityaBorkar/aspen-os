import { accountingReceiptItem, accountingReceiptNote } from "#/db-schemas/purchase";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getReceiptNote = Workflow.name("accounting.receipt.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [note] = await ctx.db
      .select()
      .from(accountingReceiptNote)
      .where(eq(accountingReceiptNote.id, id))
      .limit(1);
    if (!note) {
      throw new Error(`Receipt note "${id}" not found.`);
    }
    const items = await ctx.db
      .select()
      .from(accountingReceiptItem)
      .where(eq(accountingReceiptItem.receipt_id, id));
    return { items, note };
  });
