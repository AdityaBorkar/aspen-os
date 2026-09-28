import { commsPushSubscription } from "#/db-schemas";
import { ListPushSubscriptionsSchema } from "#/schemas/push";

import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import { object } from "valibot";

const ListInputSchema = object({ input: ListPushSubscriptionsSchema });

/**
 * Lists the acting user's push subscriptions. Runs in the `$global` scope
 * (control-plane subscriptions). Never returns another user's rows.
 */
export const list = Workflow.name("comms.push.list")
  .input(ListInputSchema)
  .handler(async (_input, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Push list requires an authenticated actor.");
    }
    return ctx.db
      .select({
        created_at: commsPushSubscription.created_at,
        endpoint: commsPushSubscription.endpoint,
        id: commsPushSubscription.id,
        origin: commsPushSubscription.origin,
        updated_at: commsPushSubscription.updated_at,
        user_agent: commsPushSubscription.user_agent,
      })
      .from(commsPushSubscription)
      .where(eq(commsPushSubscription.user_id, ctx.actorId))
      .orderBy(desc(commsPushSubscription.created_at));
  });
