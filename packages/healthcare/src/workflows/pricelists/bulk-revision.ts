import { healthcareService, healthcareServicePrice } from "#/db-schemas/services";
import { SERVICE_EVENTS } from "#/pubsub";
import { ApplyBulkRevisionSchema, PreviewBulkRevisionSchema } from "#/schemas/services";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPricelistStep, toServicePriceDto } from "#/workflow-steps/fetch-service";
import { todayDateString } from "#/workflows/pricelists/shared";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq, lte, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { object, parse } from "valibot";

const PreviewInputSchema = object({ input: PreviewBulkRevisionSchema });

export interface BulkRevisionPreviewLine {
  amount: number;
  currentAmount: number | null;
  currentEffectiveFrom: string | null;
  serviceCode: string;
  serviceId: string;
  serviceName: string;
}

async function buildPreview(
  db: PostgresJsDatabase,
  input: {
    branchId: string;
    date: string;
    pricelistCode: string;
    pricelistId: string;
    rows?: { amount: number; serviceId: string }[];
    upliftPct?: number;
  },
): Promise<BulkRevisionPreviewLine[]> {
  const services = await db
    .select({
      code: healthcareService.code,
      id: healthcareService.id,
      name: healthcareService.name,
    })
    .from(healthcareService)
    .where(eq(healthcareService.branch_id, input.branchId))
    .limit(2000);

  const targets = new Map<string, number>();
  if (input.rows) {
    for (const row of input.rows) {
      targets.set(row.serviceId, row.amount);
    }
  }

  const lines: BulkRevisionPreviewLine[] = [];
  for (const service of services) {
    let next: number | null = targets.get(service.id) ?? null;
    const [current] = await db
      .select()
      .from(healthcareServicePrice)
      .where(
        and(
          eq(healthcareServicePrice.service_id, service.id),
          eq(healthcareServicePrice.branch_id, input.branchId),
          lte(healthcareServicePrice.effective_from, input.date),
          or(
            eq(healthcareServicePrice.pricelist_id, input.pricelistId),
            eq(healthcareServicePrice.pricelist, input.pricelistCode),
          ),
        ),
      )
      .orderBy(desc(healthcareServicePrice.effective_from))
      .limit(1);
    if (next === null && input.upliftPct !== undefined && current) {
      next = Math.round(Number(current.amount) * (1 + input.upliftPct / 100) * 100) / 100;
    }
    if (next === null) {
      continue;
    }
    lines.push({
      amount: next,
      currentAmount: current ? Number(current.amount) : null,
      currentEffectiveFrom: current ? current.effective_from : null,
      serviceCode: service.code,
      serviceId: service.id,
      serviceName: service.name,
    });
  }
  return lines;
}

export const previewBulkRevision = Workflow.name("healthcare.pricelists.preview-bulk-revision")
  .input(PreviewInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PreviewBulkRevisionSchema, input);
    if (!parsed.rows && parsed.upliftPct === undefined) {
      throw new Error("Provide explicit rows or an uplift percent to preview.");
    }
    const pricelist = await ctx.step.run(fetchPricelistStep, { id: parsed.pricelistId });
    const lines = await ctx.step.run("build-preview", () =>
      buildPreview(ctx.db, {
        branchId: parsed.branchId,
        date: todayDateString(),
        pricelistCode: pricelist.code,
        pricelistId: pricelist.id,
        rows: parsed.rows,
        upliftPct: parsed.upliftPct,
      }),
    );
    return { lines, pricelistCode: pricelist.code, pricelistId: pricelist.id };
  });

const ApplyInputSchema = object({ input: ApplyBulkRevisionSchema });

export const applyBulkRevision = Workflow.name("healthcare.pricelists.apply-bulk-revision")
  .input(ApplyInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ApplyBulkRevisionSchema, input);
    if (parsed.approvedBy === parsed.requestedBy) {
      throw new Error(
        "Bulk price revision needs maker-checker approval: approver must differ from requester.",
      );
    }
    if (!parsed.rows && parsed.upliftPct === undefined) {
      throw new Error("Provide explicit rows or an uplift percent to apply.");
    }
    const today = todayDateString();
    if (parsed.effectiveFrom < today) {
      throw new Error(
        `Bulk revision effective date (${parsed.effectiveFrom}) must be today or later; prices are prospective only.`,
      );
    }
    const pricelist = await ctx.step.run(fetchPricelistStep, { id: parsed.pricelistId });
    if (pricelist.status !== "published") {
      throw new Error(
        `Pricelist "${pricelist.code}" is ${pricelist.status}; bulk revision applies only to published pricelists.`,
      );
    }
    const lines = await ctx.step.run("build-preview", () =>
      buildPreview(ctx.db, {
        branchId: parsed.branchId,
        date: today,
        pricelistCode: pricelist.code,
        pricelistId: pricelist.id,
        rows: parsed.rows,
        upliftPct: parsed.upliftPct,
      }),
    );
    if (lines.length === 0) {
      throw new Error("Nothing to revise: no services matched rows or uplift.");
    }
    const saved = await ctx.step.run("insert-prices", async () =>
      Promise.all(
        lines.map(async (line) => {
          const [row] = await ctx.db
            .insert(healthcareServicePrice)
            .values({
              amount: String(line.amount),
              branch_id: parsed.branchId,
              effective_from: parsed.effectiveFrom,
              id: crypto.randomUUID(),
              pricelist: pricelist.code,
              pricelist_id: pricelist.id,
              service_id: line.serviceId,
            })
            .returning();
          if (!row) {
            throw new Error(`Failed to save revised price for "${line.serviceCode}".`);
          }
          return toServicePriceDto(row);
        }),
      ),
    );
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: {
          approvedBy: parsed.approvedBy,
          effectiveFrom: parsed.effectiveFrom,
          lines: lines.length,
          requestedBy: parsed.requestedBy,
        },
        crudAction: "update",
        entityId: pricelist.id,
        entityType: AUDIT_ENTITY_TYPE.SERVICE,
      });
      await ctx.pubsub.publish(SERVICE_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: parsed.branchId,
        id: pricelist.id,
      });
    });
    return { lines: saved.length, pricelistCode: pricelist.code, pricelistId: pricelist.id };
  });
