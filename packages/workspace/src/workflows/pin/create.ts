import { workspacePin } from "#/db-schemas";
import { PIN_EVENTS } from "#/pubsub";
import { resolveActorId } from "#/services/access-service";
import { PinItemInputSchema } from "#/types";
import { AUDIT_ACTION } from "#/utils/constants";
import { auditEntityType } from "#/workflows/pin/shared";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: PinItemInputSchema });

export const pinItem = Workflow.name("workspace.pin.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PinItemInputSchema, input);
    const userId = resolveActorId(ctx.actorId, parsed.userId);

    const existing = await ctx.db
      .select({ id: workspacePin.id })
      .from(workspacePin)
      .where(
        and(
          eq(workspacePin.userId, userId),
          eq(workspacePin.itemType, parsed.itemType),
          eq(workspacePin.itemId, parsed.itemId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    const [pin] = await ctx.db
      .insert(workspacePin)
      .values({ itemId: parsed.itemId, itemType: parsed.itemType, userId })
      .returning();

    if (!pin) {
      throw new Error("Failed to create pin.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.PINNED,
      crudAction: "create",
      entityId: parsed.itemId,
      entityType: auditEntityType(parsed.itemType),
      metadata: { itemType: parsed.itemType },
    });

    await ctx.pubsub.publish(PIN_EVENTS.CREATED, {
      itemId: parsed.itemId,
      itemType: parsed.itemType,
      userId,
    });

    return pin;
  });
