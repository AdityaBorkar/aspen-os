import { healthcareLeaveBlock } from "#/db-schemas/practitioners";
import { PRACTITIONER_EVENTS } from "#/pubsub";
import { CreateLeaveBlockSchema } from "#/schemas/practitioners";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPractitionerStep, toLeaveBlockDto } from "#/workflow-steps/fetch-practitioner";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const BlockLeaveInputSchema = object({ input: CreateLeaveBlockSchema });

export const blockPractitionerLeave = Workflow.name("healthcare.practitioners.block-leave")
  .input(BlockLeaveInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLeaveBlockSchema, input);
    if (parsed.to < parsed.from) {
      throw new Error(`Leave end (${parsed.to}) cannot be before start (${parsed.from}).`);
    }
    const practitioner = await ctx.step.run(fetchPractitionerStep, {
      id: parsed.practitionerId,
    });
    const [row] = await ctx.step.run("insert-leave-block", async () =>
      ctx.db
        .insert(healthcareLeaveBlock)
        .values({
          branch_id: parsed.branchId,
          from_date: parsed.from,
          id: crypto.randomUUID(),
          practitioner_id: parsed.practitionerId,
          reason: parsed.reason ?? null,
          to_date: parsed.to,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to block leave.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PRACTITIONER,
        newState: {
          from: row.from_date,
          id: row.id,
          practitionerId: row.practitioner_id,
          to: row.to_date,
        },
      });
      await ctx.pubsub.publish(PRACTITIONER_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: practitioner.branch_id,
        id: parsed.practitionerId,
      });
    });
    return toLeaveBlockDto(row);
  });
