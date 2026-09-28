import { commsPushSubscription } from "#/db-schemas";
import { UnsubscribeSchema } from "#/schemas/push";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

const UnsubscribeInputSchema = object({ input: UnsubscribeSchema });

/**
 * Removes the acting user's subscription for one endpoint. Runs in the
 * `$global` scope (control-plane subscriptions). Scoped by `user_id` so a user
 * can only delete their own device, never another user's row.
 */
export const unsubscribe = Workflow.name("comms.push.unsubscribe")
  .input(UnsubscribeInputSchema)
  .handler(async ({ input }, ctx): Promise<{ removed: number }> => {
    if (!ctx.actorId) {
      throw new Error("Push unsubscribe requires an authenticated actor.");
    }

    const removed = await ctx.db
      .delete(commsPushSubscription)
      .where(
        and(
          eq(commsPushSubscription.endpoint, input.endpoint),
          eq(commsPushSubscription.user_id, ctx.actorId),
        ),
      )
      .returning({ id: commsPushSubscription.id });

    return { removed: removed.length };
  });
