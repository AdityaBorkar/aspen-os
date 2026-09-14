import { healthcareNursingChecklist } from "#/db-schemas/nursing";
import { NURSING_EVENTS } from "#/pubsub";
import { RecordChecklistSchema } from "#/schemas/nursing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ChecklistRecordInputSchema = object({ input: RecordChecklistSchema });

export const checklistRecord = Workflow.name("healthcare.nursing.checklist-record")
  .input(ChecklistRecordInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecordChecklistSchema, input);
    const branchId = parsed.branchId ?? "main";
    const open = parsed.items.filter((item) => item.done === "no");
    if (open.length > 0) {
      throw new Error(
        `Checklist has ${open.length} open item(s); complete them or mark na before filing`,
      );
    }
    const [row] = await ctx.step.run("insert-checklist", async () =>
      ctx.db
        .insert(healthcareNursingChecklist)
        .values({
          branch_id: branchId,
          items: parsed.items,
          name: parsed.name,
          patient_id: parsed.patientId ?? null,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record checklist.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.NURSING,
        newState: { itemCount: row.items.length, name: row.name },
      });
      await ctx.pubsub.publish(NURSING_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { id: row.id, name: row.name };
  });
