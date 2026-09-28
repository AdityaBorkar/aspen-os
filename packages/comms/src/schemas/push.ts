import { minLength, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

/**
 * A browser Push API subscription (``PushSubscription.toJSON()``). The
 * `endpoint` is the browser push service URL; `p256dh`/`auth` are the
 * RFC 8291 client keys. `userAgent`/`origin` are diagnostics only. The owner
 * is never part of the payload — it always comes from the session actor.
 */
export const SubscribeSchema = object({
  auth: pipe(string(), minLength(1)),
  endpoint: pipe(string(), minLength(1)),
  origin: optional(string()),
  p256dh: pipe(string(), minLength(1)),
  userAgent: optional(string()),
});

export type SubscribeInput = InferOutput<typeof SubscribeSchema>;

export const UnsubscribeSchema = object({
  endpoint: pipe(string(), minLength(1)),
});

export type UnsubscribeInput = InferOutput<typeof UnsubscribeSchema>;

export const ListPushSubscriptionsSchema = object({});

export type ListPushSubscriptionsInput = InferOutput<typeof ListPushSubscriptionsSchema>;
