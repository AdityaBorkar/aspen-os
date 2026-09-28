import { commsPushSubscription } from "#/db-schemas";
import type { CommsPushSubscription } from "#/db-schemas/push-subscription";

import type { JsonValue } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sendNotification, WebPushError } from "web-push";

/** VAPID identity for self-hosted Web Push. Keys are URL-safe base64. */
export interface CommsPushConfig {
  subject: string;
  vapidPrivateKey: string;
  vapidPublicKey: string;
}

/** The JSON payload the service worker renders as a notification. */
export interface PushPayload {
  badge?: string;
  body?: string;
  data?: Record<string, JsonValue>;
  icon?: string;
  tag?: string;
  title: string;
  url?: string;
}

export interface PushDispatchOutcome {
  endpoint: string;
  error?: string;
  ok: boolean;
  statusCode?: number;
  subscriptionId: string;
}

/** The slice of ChildLogger this service needs (ChildLogger is not exported). */
interface PushLogger {
  info: (message: string, metadata?: Record<string, JsonValue>) => void;
  warn: (message: string, metadata?: Record<string, JsonValue>) => void;
}

/**
 * Push services drop subscriptions that no longer exist. 404/410 means the
 * endpoint is permanently gone, so the row is deleted instead of retried
 * forever (mirrors how APNs/FCM treat stale device tokens).
 */
const GONE_STATUS_CODES = new Set([404, 410]);

export async function listPushSubscriptions(
  db: PostgresJsDatabase,
  userId: string,
): Promise<CommsPushSubscription[]> {
  return db.select().from(commsPushSubscription).where(eq(commsPushSubscription.user_id, userId));
}

export interface SendPushInput {
  config: CommsPushConfig | undefined;
  db: PostgresJsDatabase;
  log?: PushLogger;
  payload: PushPayload;
  userId: string;
}

/**
 * Fans a payload out to every subscription the recipient owns. Runs on the
 * control-plane database (subscriptions are host-global) even when the
 * surrounding `notify()` runs tenant-scoped. Returns one outcome per
 * subscription; never throws for a single failed endpoint so one dead device
 * cannot fail the notification.
 */
export async function sendPushToSubscriptions(
  input: SendPushInput,
): Promise<PushDispatchOutcome[]> {
  const { config, db, log, payload, userId } = input;
  if (!config) {
    throw new Error(
      "Push is not configured; set the VAPID keypair before sending push notifications.",
    );
  }

  const subscriptions = await listPushSubscriptions(db, userId);
  const serialized = JSON.stringify(payload);

  return Promise.all(
    subscriptions.map(async (subscription): Promise<PushDispatchOutcome> => {
      try {
        const response = await sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { auth: subscription.auth, p256dh: subscription.p256dh },
          },
          serialized,
          {
            TTL: 60 * 60,
            vapidDetails: {
              privateKey: config.vapidPrivateKey,
              publicKey: config.vapidPublicKey,
              subject: config.subject,
            },
          },
        );
        return {
          endpoint: subscription.endpoint,
          ok: true,
          statusCode: response.statusCode,
          subscriptionId: subscription.id,
        };
      } catch (error) {
        const statusCode = error instanceof WebPushError ? error.statusCode : undefined;
        const message = error instanceof Error ? error.message : String(error);
        if (statusCode !== undefined && GONE_STATUS_CODES.has(statusCode)) {
          await db
            .delete(commsPushSubscription)
            .where(eq(commsPushSubscription.id, subscription.id));
          log?.info(`Removed expired push subscription "${subscription.id}".`);
        } else {
          log?.warn(`Push delivery failed for subscription "${subscription.id}".`, {
            error: message,
            statusCode: statusCode ?? null,
          });
        }
        return {
          endpoint: subscription.endpoint,
          error: message,
          ok: false,
          statusCode,
          subscriptionId: subscription.id,
        };
      }
    }),
  );
}
