import { REORDER_EVENTS } from "#/pubsub";
import { getAvailableQty } from "#/services/stock-service";
import type { DbOrTx } from "#/services/stock-service";
import { SCHEDULED_JOBS } from "#/utils/constants";

import type { AuditUnit, PubSubUnit } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";

export const REORDER_SCAN_CRON = "30 2 * * *";

export interface ReorderScannerDeps {
  audit: AuditUnit;
  db: DbOrTx;
  pubsub: PubSubUnit;
}

export interface ReorderRuleRow {
  check_in_group_id: string;
  item_id: string;
  material_request_type: string;
  reorder_level: number;
  reorder_qty: number;
  request_for_warehouse_id: string;
}

export interface ReorderBreach {
  availableQty: number;
  checkInGroupId: string;
  itemId: string;
  materialRequestType: string;
  reorderLevel: number;
  reorderQty: number;
  requestForWarehouseId: string;
}

export type ReorderRuleProvider = (db: DbOrTx) => Promise<ReorderRuleRow[]>;

export function breachKey(breach: Pick<ReorderBreach, "itemId" | "requestForWarehouseId">): string {
  return `${breach.itemId}::${breach.requestForWarehouseId}`;
}

function toFiniteNumber(value: string | number | null | undefined, field: string): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Reorder rule has a non-finite "${field}": "${String(value)}".`);
  }
  return parsed;
}

// Cross-module read: the products module owns `products_reorder_rule`
// (see @aspen-os/products `productsReorderRule`). Inventory needs its active
// rows to evaluate breaches, and the platform merges both modules' schemas
// into one tenant database, so this provider reads that shared table
// directly. Keep all products-table knowledge isolated here behind
// `ReorderRuleProvider` so the rest of inventory stays decoupled and tests
// can inject an in-memory provider.
export async function defaultReorderRuleProvider(db: DbOrTx): Promise<ReorderRuleRow[]> {
  const rows = await db.execute<{
    check_in_group_id: string;
    item_id: string;
    material_request_type: string;
    reorder_level: string;
    reorder_qty: string;
    request_for_warehouse_id: string;
  }>(
    sql`SELECT item_id, check_in_group_id, request_for_warehouse_id, reorder_level, reorder_qty, material_request_type FROM products_reorder_rule WHERE is_disabled = false`,
  );
  return rows.map((row) => ({
    check_in_group_id: row.check_in_group_id,
    item_id: row.item_id,
    material_request_type: row.material_request_type,
    reorder_level: toFiniteNumber(row.reorder_level, "reorder_level"),
    reorder_qty: toFiniteNumber(row.reorder_qty, "reorder_qty"),
    request_for_warehouse_id: row.request_for_warehouse_id,
  }));
}

export async function evaluateReorderBreaches(
  db: DbOrTx,
  provider: ReorderRuleProvider = defaultReorderRuleProvider,
): Promise<ReorderBreach[]> {
  const rules = await provider(db);
  const evaluated = await Promise.all(
    rules.map(async (rule) => {
      const availableQty = await getAvailableQty(db, rule.item_id, rule.request_for_warehouse_id);
      if (availableQty >= rule.reorder_level) {
        return null;
      }
      return {
        availableQty,
        checkInGroupId: rule.check_in_group_id,
        itemId: rule.item_id,
        materialRequestType: rule.material_request_type,
        reorderLevel: rule.reorder_level,
        reorderQty: rule.reorder_qty,
        requestForWarehouseId: rule.request_for_warehouse_id,
      };
    }),
  );
  const breaches = evaluated.filter((breach) => breach !== null);
  const byKey = new Map<string, ReorderBreach>();
  for (const breach of breaches) {
    const key = breachKey(breach);
    const existing = byKey.get(key);
    if (!existing || breach.availableQty < existing.availableQty) {
      byKey.set(key, breach);
    }
  }
  return [...byKey.values()];
}

export interface ReorderScanOptions {
  provider?: ReorderRuleProvider;
  seenKeys?: Set<string>;
}

async function notifyBreach(deps: ReorderScannerDeps, breach: ReorderBreach): Promise<void> {
  await deps.audit.write({
    action: "reorder_triggered",
    entityId: breach.itemId,
    entityType: "inventory:reorder",
    metadata: {
      availableQty: breach.availableQty,
      reorderLevel: breach.reorderLevel,
      warehouseId: breach.requestForWarehouseId,
    },
  });
  await deps.pubsub.publish(REORDER_EVENTS.TRIGGERED, {
    availableQty: breach.availableQty,
    itemId: breach.itemId,
    materialRequestType: breach.materialRequestType,
    reorderLevel: breach.reorderLevel,
    reorderQty: breach.reorderQty,
    requestForWarehouseId: breach.requestForWarehouseId,
  });
}

export async function scanReorderBreaches(
  deps: ReorderScannerDeps,
  options: ReorderScanOptions = {},
): Promise<ReorderBreach[]> {
  const breaches = await evaluateReorderBreaches(deps.db, options.provider);
  const fresh = options.seenKeys
    ? breaches.filter((breach) => !options.seenKeys?.has(breachKey(breach)))
    : breaches;
  for (const breach of fresh) {
    await notifyBreach(deps, breach);
    options.seenKeys?.add(breachKey(breach));
  }
  return fresh;
}

export async function registerReorderScanner(pubsub: PubSubUnit, cron: string): Promise<string> {
  await pubsub.schedule({
    cron,
    data: {},
    options: { retryBackoff: true, retryDelay: 60, retryLimit: 3 },
    topic: SCHEDULED_JOBS.REORDER_SCAN,
  });
  return SCHEDULED_JOBS.REORDER_SCAN;
}

export async function registerReorderScanHandler(
  topic: string,
  deps: ReorderScannerDeps,
): Promise<void> {
  await deps.pubsub.subscribe(topic, async () => {
    await scanReorderBreaches(deps);
  });
}

export async function registerReorderScan(
  pubsub: PubSubUnit,
  deps: Omit<ReorderScannerDeps, "pubsub">,
  cron: string,
): Promise<() => Promise<void>> {
  const topic = await registerReorderScanner(pubsub, cron);
  await registerReorderScanHandler(topic, { ...deps, pubsub });
  return async () => {
    await unregisterReorderScanner(topic, { pubsub });
  };
}

export async function unregisterReorderScanner(
  topic: string | null,
  { pubsub }: { pubsub: PubSubUnit },
): Promise<void> {
  if (!topic) {
    return;
  }
  const outcomes = await Promise.allSettled([pubsub.unsubscribe(topic), pubsub.unschedule(topic)]);
  if (outcomes.some((outcome) => outcome.status === "rejected")) {
    throw new Error(`Failed to unregister reorder scanner for topic "${topic}".`);
  }
}
