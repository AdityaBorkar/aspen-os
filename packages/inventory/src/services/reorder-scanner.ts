import { REORDER_EVENTS } from "#/pubsub";
import { getAvailableQty } from "#/services/stock-service";
import type { DB } from "#/services/stock-service";
import { SCHEDULED_JOBS } from "#/utils/constants";

import type { AuditUnit, PubSubUnit } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";

export const REORDER_SCAN_CRON = "30 2 * * *";

export interface ReorderScannerDeps {
  audit: AuditUnit;
  db: DB;
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
  checkInGroupId: string;
  itemId: string;
  materialRequestType: string;
  projectedQty: number;
  reorderLevel: number;
  reorderQty: number;
  requestForWarehouseId: string;
}

async function readReorderRules(db: DB): Promise<ReorderRuleRow[]> {
  try {
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
      reorder_level: Number(row.reorder_level ?? 0),
      reorder_qty: Number(row.reorder_qty ?? 0),
      request_for_warehouse_id: row.request_for_warehouse_id,
    }));
  } catch {
    return [];
  }
}

export async function evaluateReorderBreaches(db: DB): Promise<ReorderBreach[]> {
  const rules = await readReorderRules(db);
  const evaluated = await Promise.all(
    rules.map(async (rule) => {
      const projectedQty = await getAvailableQty(db, rule.item_id, rule.request_for_warehouse_id);
      if (projectedQty >= rule.reorder_level) {
        return null;
      }
      return {
        checkInGroupId: rule.check_in_group_id,
        itemId: rule.item_id,
        materialRequestType: rule.material_request_type,
        projectedQty,
        reorderLevel: rule.reorder_level,
        reorderQty: rule.reorder_qty,
        requestForWarehouseId: rule.request_for_warehouse_id,
      };
    }),
  );
  return evaluated.flatMap((breach) => (breach ? [breach] : []));
}

export async function scanReorderBreaches(deps: ReorderScannerDeps): Promise<ReorderBreach[]> {
  const breaches = await evaluateReorderBreaches(deps.db);
  // oxlint-disable eslint/no-await-in-loop
  for (const breach of breaches) {
    await deps.pubsub.publish(REORDER_EVENTS.TRIGGERED, {
      itemId: breach.itemId,
      materialRequestType: breach.materialRequestType,
      projectedQty: breach.projectedQty,
      reorderLevel: breach.reorderLevel,
      reorderQty: breach.reorderQty,
      requestForWarehouseId: breach.requestForWarehouseId,
    });
    await deps.audit.write({
      action: "reorder_triggered",
      entityId: breach.itemId,
      entityType: "inventory:reorder",
      metadata: {
        projectedQty: breach.projectedQty,
        reorderLevel: breach.reorderLevel,
        warehouseId: breach.requestForWarehouseId,
      },
    });
  }
  // oxlint-enable eslint/no-await-in-loop
  return breaches;
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

export async function unregisterReorderScanner(
  topic: string | null,
  { pubsub }: { pubsub: PubSubUnit },
): Promise<void> {
  if (!topic) {
    return;
  }
  try {
    await pubsub.unsubscribe(topic);
    await pubsub.unschedule(topic);
  } catch {
    // Best-effort cleanup
  }
}
