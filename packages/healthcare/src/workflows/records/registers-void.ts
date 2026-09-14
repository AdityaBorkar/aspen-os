import { healthcareMedicalRegister } from "#/db-schemas/records";
import { RECORDS_EVENTS } from "#/pubsub";
import { VoidRegisterSchema } from "#/schemas/records";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RegistersVoidInputSchema = object({ input: VoidRegisterSchema });

export const registersVoid = Workflow.name("healthcare.records.registers-void")
  .input(RegistersVoidInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(VoidRegisterSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [entry] = await ctx.step.run("load-entry", async () =>
      ctx.db
        .select()
        .from(healthcareMedicalRegister)
        .where(eq(healthcareMedicalRegister.id, parsed.entryId))
        .limit(1),
    );
    if (!entry) {
      throw new Error("Register entry not found; verify the entry id and retry");
    }
    if (entry.status === "void") {
      throw new Error("Register entry is already void; the serial number is kept");
    }
    const [row] = await ctx.step.run("void-entry", async () =>
      ctx.db
        .update(healthcareMedicalRegister)
        .set({
          status: "void",
          updated_at: new Date(),
          void_reason: parsed.reason,
          voided_at: new Date(),
          voided_by: parsed.voidedBy,
        })
        .where(eq(healthcareMedicalRegister.id, entry.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to void register entry.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: entry.id,
        entityType: AUDIT_ENTITY_TYPE.RECORDS,
        newState: { serial: entry.serial, status: "void" },
      });
      await ctx.pubsub.publish(RECORDS_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: entry.id,
      });
    });
    return { entryId: entry.id, serial: entry.serial, status: row.status };
  });
