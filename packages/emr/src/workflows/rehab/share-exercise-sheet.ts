import { healthcareExerciseSheet } from "#/db-schemas/rehab";
import { REHAB_EVENTS } from "#/pubsub";
import { ShareExerciseSheetSchema } from "#/schemas/rehab";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ShareExerciseSheetInputSchema = object({ input: ShareExerciseSheetSchema });

export const shareExerciseSheet = Workflow.name("emr.rehab.share-exercise-sheet")
  .input(ShareExerciseSheetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ShareExerciseSheetSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const sheet = await ctx.step.run("fetch-exercise-sheet", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcareExerciseSheet)
        .where(eq(healthcareExerciseSheet.id, parsed.sheetId))
        .limit(1);
      if (!row) {
        throw new Error("Exercise sheet not found; prescribe the sheet first");
      }
      return row;
    });

    const delivery = {
      actorId,
      at: new Date().toISOString(),
      channel: parsed.channel,
      to: parsed.to ?? null,
    } satisfies Record<string, JsonValue>;
    const prior = sheet.payload.deliveries;
    const deliveries = [...(Array.isArray(prior) ? prior : []), delivery];

    const [row] = await ctx.step.run("append-delivery", async () =>
      ctx.db
        .update(healthcareExerciseSheet)
        .set({ payload: { ...sheet.payload, deliveries } })
        .where(eq(healthcareExerciseSheet.id, sheet.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to log the exercise sheet delivery.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.REHAB,
        newState: { channel: parsed.channel, deliveries: deliveries.length, id: row.id },
      });
      await ctx.pubsub.publish(REHAB_EVENTS.UPDATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return { deliveries, id: row.id };
  });
