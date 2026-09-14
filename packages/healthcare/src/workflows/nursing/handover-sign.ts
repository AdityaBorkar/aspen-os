import { healthcareHandover } from "#/db-schemas/nursing";
import { NURSING_EVENTS } from "#/pubsub";
import { RecordHandoverSchema } from "#/schemas/nursing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const HandoverSignInputSchema = object({ input: RecordHandoverSchema });

export const handoverSign = Workflow.name("healthcare.nursing.handover-sign")
  .input(HandoverSignInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecordHandoverSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [draft] = await ctx.step.run("load-draft", async () =>
      ctx.db
        .select()
        .from(healthcareHandover)
        .where(
          and(eq(healthcareHandover.branch_id, branchId), eq(healthcareHandover.status, "draft")),
        )
        .orderBy(desc(healthcareHandover.created_at))
        .limit(1),
    );
    if (!draft) {
      throw new Error("No draft handover to sign; compile a draft first");
    }
    const [row] = await ctx.step.run("sign-handover", async () =>
      ctx.db
        .update(healthcareHandover)
        .set({
          notes: parsed.notes,
          signed_at: new Date(),
          signed_by: ctx.actorId ?? null,
          status: "signed",
          updated_at: new Date(),
        })
        .where(eq(healthcareHandover.id, draft.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to sign handover.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.SIGNED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.NURSING,
        newState: { signedBy: row.signed_by, status: row.status },
      });
      await ctx.pubsub.publish(NURSING_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { handoverId: row.id, status: row.status };
  });
