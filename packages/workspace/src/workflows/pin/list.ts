import { workspacePin } from "#/db-schemas";
import { ListPinsSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ input: ListPinsSchema });

export const listPins = Workflow.name("workspace.pin.list")
  .input(ListInputSchema)
  .handler(async ({ input }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }
    const parsed = parse(ListPinsSchema, input);

    const conditions = [eq(workspacePin.user_id, ctx.actorId)];
    if (parsed.itemType) {
      conditions.push(eq(workspacePin.item_type, parsed.itemType));
    }

    return ctx.db
      .select()
      .from(workspacePin)
      .where(and(...conditions))
      .orderBy(asc(workspacePin.sort_order));
  });
