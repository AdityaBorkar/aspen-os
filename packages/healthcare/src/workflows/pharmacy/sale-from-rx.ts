import {
  healthcarePharmacyBatch,
  healthcarePharmacyItem,
  healthcarePharmacySale,
} from "#/db-schemas/pharmacy";
import { PHARMACY_EVENTS } from "#/pubsub";
import { SaleFromRxSchema } from "#/schemas/pharmacy";
import type { SaleFromRxInput } from "#/schemas/pharmacy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";
import { object, parse } from "valibot";

const SaleFromRxInputSchema = object({ input: SaleFromRxSchema });

type BatchRow = typeof healthcarePharmacyBatch.$inferSelect;

function isExpired(expiry: string): boolean {
  return new Date(expiry).getTime() < Date.now();
}

function daysToExpiry(expiry: string): number {
  return Math.floor((new Date(expiry).getTime() - Date.now()) / 86_400_000);
}

export interface ResolvedLine {
  [key: string]: string | number | null;
  batchId: string;
  itemId: string;
  lot: string;
  mrp: number;
  qty: number;
  substituteOf: string | null;
}

export interface SubstitutionRecord {
  [key: string]: string | null;
  reason: string | null;
  substituteOf: string;
  suppliedItemId: string;
}

export const saleFromRx = Workflow.name("healthcare.pharmacy.sale-from-rx")
  .input(SaleFromRxInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SaleFromRxSchema, input);
    const branchId = parsed.branchId ?? "main";

    const items = await ctx.step.run("fetch-items", async () => {
      const wanted = new Set<string>();
      for (const line of parsed.items) {
        wanted.add(line.itemId);
        if (line.substituteOf) {
          wanted.add(line.substituteOf);
        }
      }
      return ctx.db
        .select()
        .from(healthcarePharmacyItem)
        .where(
          and(
            eq(healthcarePharmacyItem.branch_id, branchId),
            inArray(healthcarePharmacyItem.id, [...wanted]),
          ),
        );
    });

    const batches = await ctx.step.run("fetch-live-batches", async () => {
      const wanted = new Set(parsed.items.map((line) => line.itemId));
      const rows = await ctx.db
        .select()
        .from(healthcarePharmacyBatch)
        .where(eq(healthcarePharmacyBatch.branch_id, branchId));
      return rows.filter(
        (batch) => wanted.has(batch.item_id) && batch.qty > 0 && !isExpired(batch.expiry),
      );
    });

    const byItemId = new Map(items.map((item) => [item.id, item]));
    const liveByItem = new Map<string, BatchRow[]>();
    for (const batch of batches) {
      const list = liveByItem.get(batch.item_id) ?? [];
      list.push(batch);
      liveByItem.set(batch.item_id, list);
    }
    for (const [itemId, list] of liveByItem.entries()) {
      liveByItem.set(
        itemId,
        list.toSorted((left, right) => left.expiry.localeCompare(right.expiry)),
      );
    }

    const resolved: ResolvedLine[] = [];
    const nearExpiry: string[] = [];
    const substitutions: SubstitutionRecord[] = [];
    // oxlint-disable eslint/no-await-in-loop
    for (const line of parsed.items satisfies SaleFromRxInput["items"]) {
      const item = byItemId.get(line.itemId);
      if (!item) {
        throw new Error(`Item ${line.itemId} not found; verify the item and retry.`);
      }
      if (item.schedule === "H1" && !parsed.prescriptionId) {
        throw new Error(
          `H1 drug ${item.name} requires a prescription; attach prescriptionId and retry.`,
        );
      }
      if (line.substituteOf) {
        const original = byItemId.get(line.substituteOf);
        if (!original) {
          throw new Error(
            `Original item ${line.substituteOf} not found; verify the substitution and retry.`,
          );
        }
        if (original.salt !== item.salt || original.strength !== item.strength) {
          throw new Error(
            `Substitution blocked: ${item.name} is not the same salt+strength as ${original.name}.`,
          );
        }
        if (item.schedule !== original.schedule) {
          throw new Error(
            `Substitution blocked: schedule mismatch (${item.schedule} vs ${original.schedule}).`,
          );
        }
        if (!line.substituteReason) {
          throw new Error(
            "Substitution requires substituteReason; record why the brand was substituted.",
          );
        }
        substitutions.push({
          reason: line.substituteReason,
          substituteOf: line.substituteOf,
          suppliedItemId: line.itemId,
        });
      }
      const live = liveByItem.get(line.itemId) ?? [];
      const fefo = live[0] ?? null;
      let batch: BatchRow | null = null;
      if (line.batchId) {
        const [explicit] = await ctx.db
          .select()
          .from(healthcarePharmacyBatch)
          .where(
            and(
              eq(healthcarePharmacyBatch.id, line.batchId),
              eq(healthcarePharmacyBatch.branch_id, branchId),
            ),
          )
          .limit(1);
        batch = explicit ?? null;
        if (fefo && batch && fefo.id !== batch.id && !parsed.fefoOverrideReason) {
          throw new Error(
            "FEFO default overridden without reason; provide fefoOverrideReason and retry.",
          );
        }
      } else {
        batch = fefo;
      }
      if (!batch) {
        throw new Error(`No live stock for ${item.name}; receive a batch first and retry.`);
      }
      if (isExpired(batch.expiry)) {
        throw new Error(
          `Batch ${batch.lot} is expired; expired stock is hard-blocked — pick a live batch.`,
        );
      }
      if (batch.qty < line.qty) {
        throw new Error(
          `Insufficient stock in batch ${batch.lot}; split across batches or receive stock.`,
        );
      }
      if (daysToExpiry(batch.expiry) < 90) {
        nearExpiry.push(batch.lot);
      }
      resolved.push({
        batchId: batch.id,
        itemId: line.itemId,
        lot: batch.lot,
        mrp: Number(batch.mrp),
        qty: line.qty,
        substituteOf: line.substituteOf ?? null,
      });
    }
    // oxlint-enable eslint/no-await-in-loop

    const saleNo = await ctx.step.run(nextHealthcareSeries, { input: { series: "sale" } });
    const total = resolved.reduce((sum, line) => sum + line.mrp * line.qty, 0);

    const created = await ctx.step.run("dispense", async () => {
      // oxlint-disable eslint/no-await-in-loop
      for (const line of resolved) {
        const [batch] = await ctx.db
          .select({ qty: healthcarePharmacyBatch.qty })
          .from(healthcarePharmacyBatch)
          .where(eq(healthcarePharmacyBatch.id, line.batchId))
          .limit(1);
        if (!batch || batch.qty < line.qty) {
          throw new Error(
            "Stock changed while dispensing; negative stock is blocked — retry the sale.",
          );
        }
        await ctx.db
          .update(healthcarePharmacyBatch)
          .set({ qty: batch.qty - line.qty })
          .where(eq(healthcarePharmacyBatch.id, line.batchId));
      }
      // oxlint-enable eslint/no-await-in-loop
      const [row] = await ctx.db
        .insert(healthcarePharmacySale)
        .values({
          branch_id: branchId,
          mode: parsed.mode,
          patient_id: parsed.patientId,
          payload: {
            fefoOverrideReason: parsed.fefoOverrideReason ?? null,
            lines: resolved,
            nearExpiryAlert: nearExpiry,
            substitutions,
          },
          prescription_id: parsed.prescriptionId ?? null,
          sale_no: `SALE-${String(saleNo).padStart(6, "0")}`,
          status: "pending",
          total: String(total),
        })
        .returning();
      if (!row) {
        throw new Error("Failed to record sale.");
      }
      return row;
    });

    const dto = {
      id: created.id,
      items: resolved,
      mode: created.mode,
      nearExpiryAlert: nearExpiry,
      patientId: created.patient_id,
      prescriptionId: created.prescription_id,
      saleNo: created.sale_no,
      status: created.status,
      substitutions,
      total: Number(created.total),
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DISPENSED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.PHARMACY,
        newState: { id: created.id, saleNo: created.sale_no, total: Number(created.total) },
      });
      await ctx.pubsub.publish(PHARMACY_EVENTS.DISPENSED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: created.id,
      });
    });
    return dto;
  });
