import { healthcareDaycareSitting } from "#/db-schemas/nursing";
import { NURSING_EVENTS } from "#/pubsub";
import { RecordSittingSchema } from "#/schemas/nursing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const SittingsSupportInputSchema = object({ input: RecordSittingSchema });

export const sittingsSupport = Workflow.name("healthcare.nursing.sittings-support")
  .input(SittingsSupportInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecordSittingSchema, input);
    const branchId = parsed.branchId ?? "main";
    if (!parsed.consentId) {
      throw new Error("Daycare sitting needs consent first; capture consent and retry");
    }
    if (parsed.phase === "post") {
      const [pre] = await ctx.step.run("load-pre-sitting", async () =>
        ctx.db
          .select({ id: healthcareDaycareSitting.id })
          .from(healthcareDaycareSitting)
          .where(
            and(
              eq(healthcareDaycareSitting.branch_id, branchId),
              eq(healthcareDaycareSitting.patient_id, parsed.patientId),
              eq(healthcareDaycareSitting.phase, "pre"),
            ),
          )
          .orderBy(desc(healthcareDaycareSitting.created_at))
          .limit(1),
      );
      if (!pre) {
        throw new Error("Post sitting needs a pre sitting; record the pre sitting first");
      }
    }
    const [row] = await ctx.step.run("insert-sitting", async () =>
      ctx.db
        .insert(healthcareDaycareSitting)
        .values({
          branch_id: branchId,
          consent_id: parsed.consentId,
          note: parsed.note ?? null,
          patient_id: parsed.patientId,
          payload: {
            consumables: parsed.consumables ?? [],
            vitals: parsed.vitals ?? null,
          },
          phase: parsed.phase,
          recorded_by: ctx.actorId ?? null,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record sitting.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.NURSING,
        newState: { patientId: row.patient_id, phase: row.phase },
      });
      await ctx.pubsub.publish(NURSING_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return {
      consumables: parsed.consumables ?? [],
      id: row.id,
      patientId: row.patient_id,
      phase: row.phase,
    };
  });
