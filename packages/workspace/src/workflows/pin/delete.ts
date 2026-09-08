import { workspacePin } from "#/db-schemas";
import { PIN_EVENTS } from "#/pubsub";
import { UnpinItemSchema } from "#/types";
import { AUDIT_ACTION } from "#/utils/constants";
import { auditEntityType } from "#/workflows/pin/shared";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const DeleteInputSchema = object({ input: UnpinItemSchema });

export const unpinItem = Workflow.name("workspace.pin.delete")
  .input(DeleteInputSchema)
  .handler(async ({ input }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }
    const parsed = parse(UnpinItemSchema, input);

    const [pin] = await ctx.db
      .select({ itemId: workspacePin.item_id, itemType: workspacePin.item_type })
      .from(workspacePin)
      .where(and(eq(workspacePin.id, parsed.id), eq(workspacePin.user_id, ctx.actorId)))
      .limit(1);

    if (!pin) {
      throw new Error(`Pin "${parsed.id}" not found.`);
    }

    await ctx.db
      .delete(workspacePin)
      .where(and(eq(workspacePin.id, parsed.id), eq(workspacePin.user_id, ctx.actorId)));

    await ctx.audit.write({
      action: AUDIT_ACTION.UNPINNED,
      crudAction: "delete",
      entityId: pin.itemId,
      entityType: auditEntityType(pin.itemType),
      metadata: { itemType: pin.itemType },
    });

    await ctx.pubsub.publish(PIN_EVENTS.REMOVED, {
      itemId: pin.itemId,
      itemType: pin.itemType,
      userId: ctx.actorId,
    });

    return { id: parsed.id };
  });
