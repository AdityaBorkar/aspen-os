import { commsPushSubscription } from "#/db-schemas";
import { SubscribeSchema } from "#/schemas/push";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const SubscribeInputSchema = object({ input: SubscribeSchema });

/**
 * Upserts a browser push subscription for the acting user. Runs in the
 * `$global` scope: subscriptions live on the control plane so one device is
 * shared across workspaces. `endpoint` is the natural key — re-subscribing the
 * same browser refreshes its keys instead of accumulating rows.
 */
export const subscribe = Workflow.name("comms.push.subscribe")
  .input(SubscribeInputSchema)
  .handler(async ({ input }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Push subscribe requires an authenticated actor.");
    }

    const now = new Date();
    const [row] = await ctx.db
      .insert(commsPushSubscription)
      .values({
        auth: input.auth,
        endpoint: input.endpoint,
        origin: input.origin ?? null,
        p256dh: input.p256dh,
        user_agent: input.userAgent ?? null,
        user_id: ctx.actorId,
      })
      .onConflictDoUpdate({
        set: {
          auth: input.auth,
          origin: input.origin ?? null,
          p256dh: input.p256dh,
          updated_at: now,
          user_agent: input.userAgent ?? null,
          user_id: ctx.actorId,
        },
        target: commsPushSubscription.endpoint,
      })
      .returning({
        created_at: commsPushSubscription.created_at,
        endpoint: commsPushSubscription.endpoint,
        id: commsPushSubscription.id,
        updated_at: commsPushSubscription.updated_at,
      });

    if (!row) {
      throw new Error("Failed to store push subscription.");
    }
    return row;
  });
