import { healthcareAdvance } from "#/db-schemas/billing";
import { healthcareResident } from "#/db-schemas/residents";
import { RESIDENT_EVENTS } from "#/pubsub";
import { CreateResidentSchema } from "#/schemas/residents";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const AdmitInputSchema = object({ input: CreateResidentSchema });

export const admit = Workflow.name("inpatient.residents.admit")
  .input(AdmitInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateResidentSchema, input);
    const branchId = parsed.branchId ?? "main";
    const no = await ctx.step.run(nextHealthcareSeries, { input: { series: "uhid" } });
    const [row] = await ctx.step.run("insert-resident", async () =>
      ctx.db
        .insert(healthcareResident)
        .values({
          address: parsed.address ?? null,
          advance: String(parsed.advance),
          age: parsed.age,
          branch_id: branchId,
          name: parsed.name,
          nok_name: parsed.nokName,
          nok_phone: parsed.nokPhone,
          payload: {
            history: parsed.history ?? null,
            idNumber: parsed.idNumber ?? null,
            payerName: parsed.payerName ?? null,
            payerPhone: parsed.payerPhone ?? null,
            stayType: parsed.stayType ?? "long-stay",
          },
          phone: parsed.phone,
          room_type: parsed.roomType ?? null,
          sex: parsed.sex,
          status: "admitted",
          uhid: `UH${String(no).padStart(6, "0")}`,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to admit resident.");
    }
    await ctx.step.run("record-advance", async () =>
      ctx.db.insert(healthcareAdvance).values({
        amount: String(parsed.advance),
        balance: String(parsed.advance),
        branch_id: branchId,
        direction: "receive",
        patient_id: row.id,
      }),
    );
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.RESIDENT,
        newState: { status: row.status, uhid: row.uhid },
      });
      await ctx.pubsub.publish(RESIDENT_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return {
      advance: Number(row.advance),
      id: row.id,
      name: row.name,
      status: row.status,
      stayType: parsed.stayType ?? "long-stay",
      uhid: row.uhid,
    };
  });
