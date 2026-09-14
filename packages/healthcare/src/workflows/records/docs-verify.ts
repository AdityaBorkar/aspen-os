import { healthcareClinicalDocument } from "#/db-schemas/records";
import { RECORDS_EVENTS } from "#/pubsub";
import { RecordsIdSchema } from "#/schemas/records";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const DocsVerifyInputSchema = object({ input: RecordsIdSchema });

export const docsVerify = Workflow.name("healthcare.records.docs-verify")
  .input(DocsVerifyInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecordsIdSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [row] = await ctx.step.run("verify-document", async () =>
      ctx.db
        .update(healthcareClinicalDocument)
        .set({
          updated_at: new Date(),
          verified: true,
          verified_at: new Date(),
          verified_by: ctx.actorId ?? null,
        })
        .where(eq(healthcareClinicalDocument.id, parsed.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Document not found; verify the doc id and retry");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.RECORDS,
        newState: { verified: true, verifiedBy: row.verified_by },
      });
      await ctx.pubsub.publish(RECORDS_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { docId: row.id, verified: true };
  });
