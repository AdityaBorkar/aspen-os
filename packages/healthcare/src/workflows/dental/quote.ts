import { healthcarePlanStage, healthcareQuote, healthcareTreatmentPlan } from "#/db-schemas/dental";
import { DENTAL_EVENTS } from "#/pubsub";
import { CreateQuoteSchema } from "#/schemas/dental";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { MS_PER_DAY } from "#/workflows/shared/package-lifecycle";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const QuoteInputSchema = object({ input: CreateQuoteSchema });

export const quote = Workflow.name("healthcare.dental.quote")
  .input(QuoteInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateQuoteSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const plan = await ctx.step.run("fetch-treatment-plan", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcareTreatmentPlan)
        .where(eq(healthcareTreatmentPlan.id, parsed.planId))
        .limit(1);
      if (!row) {
        throw new Error("Treatment plan not found; build the plan first");
      }
      return row;
    });
    if (plan.patient_id !== parsed.patientId) {
      throw new Error("Patient does not match the treatment plan; check the selected patient");
    }

    const stages = await ctx.step.run("fetch-plan-stages", async () =>
      ctx.db
        .select()
        .from(healthcarePlanStage)
        .where(eq(healthcarePlanStage.plan_id, parsed.planId)),
    );

    const validDays = parsed.validDays ?? 30;
    const validTill =
      parsed.validTill ?? new Date(Date.now() + validDays * MS_PER_DAY).toISOString();

    const subtotal = stages.reduce((sum, stage) => sum + Number(stage.price), 0);
    const discountPct = parsed.discountPct ?? 0;
    const gstPct = parsed.gstPct ?? 0;
    const total = Math.round(subtotal * (1 - discountPct / 100) * (1 + gstPct / 100) * 100) / 100;

    const [row] = await ctx.step.run("insert-quote", async () =>
      ctx.db
        .insert(healthcareQuote)
        .values({
          branch_id: branchId,
          created_by: actorId,
          discount_pct: String(discountPct),
          gst_pct: String(gstPct),
          patient_id: parsed.patientId,
          payload: { validDays, validTill },
          plan_id: parsed.planId,
          status: "Draft",
          subtotal: String(subtotal),
          total: String(total),
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to raise the quote.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.DENTAL,
        newState: {
          id: row.id,
          patientId: row.patient_id,
          planId: row.plan_id,
          subtotal,
          total,
        },
      });
      await ctx.pubsub.publish(DENTAL_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      discountPct: Number(row.discount_pct),
      gstPct: Number(row.gst_pct),
      id: row.id,
      patientId: row.patient_id,
      planId: row.plan_id,
      status: row.status,
      subtotal,
      total,
      validDays,
      validTill,
    };
  });
