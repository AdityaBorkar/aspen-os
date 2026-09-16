import { AYUSH_EVENTS } from "#/pubsub";
import { AyushPrescriptionSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const PrescribeAyushInputSchema = object({ input: AyushPrescriptionSchema });

export const prescribeAyush = Workflow.name("emr.ayush.prescribe")
  .input(PrescribeAyushInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AyushPrescriptionSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";
    const classical = parsed.items.filter((item) => item.kind === "classical");
    const proprietary = parsed.items.filter((item) => item.kind === "proprietary");

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: parsed.encounterId,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: {
          anupana: parsed.anupana ?? null,
          classicalCount: classical.length,
          encounterId: parsed.encounterId,
          patientId: parsed.patientId,
          proprietaryCount: proprietary.length,
        },
      });
      await ctx.pubsub.publish(AYUSH_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: parsed.encounterId,
      });
    });

    return {
      anupana: parsed.anupana ?? null,
      branchId,
      caseId: parsed.caseId ?? null,
      classical,
      encounterId: parsed.encounterId,
      patientId: parsed.patientId,
      proprietary,
    };
  });
