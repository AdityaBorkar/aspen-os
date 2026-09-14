import { healthcareMedicalAddendum } from "#/db-schemas/records";
import { RECORDS_EVENTS } from "#/pubsub";
import { AppendAddendumSchema } from "#/schemas/records";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const AddendumAppendInputSchema = object({ input: AppendAddendumSchema });

export const addendumAppend = Workflow.name("healthcare.records.addendum-append")
  .input(AddendumAppendInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AppendAddendumSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [row] = await ctx.step.run("insert-addendum", async () =>
      ctx.db
        .insert(healthcareMedicalAddendum)
        .values({
          author_id: parsed.authorId,
          branch_id: branchId,
          encounter_id: parsed.encounterId,
          note: parsed.note,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to append addendum.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.RECORDS,
        newState: { encounterId: row.encounter_id },
      });
      await ctx.pubsub.publish(RECORDS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { encounterId: row.encounter_id, id: row.id };
  });
