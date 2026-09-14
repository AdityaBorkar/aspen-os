import { healthcarePosting } from "#/db-schemas/practitioners";
import { PRACTITIONER_EVENTS } from "#/pubsub";
import { CreatePostingSchema } from "#/schemas/practitioners";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPractitionerStep, toPostingDto } from "#/workflow-steps/fetch-practitioner";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const AddPostingInputSchema = object({ input: CreatePostingSchema });

export const addPractitionerPosting = Workflow.name("healthcare.practitioners.add-posting")
  .input(AddPostingInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePostingSchema, input);
    if (parsed.to !== undefined && parsed.to < parsed.from) {
      throw new Error(`Posting end (${parsed.to}) cannot be before start (${parsed.from}).`);
    }
    const practitioner = await ctx.step.run(fetchPractitionerStep, {
      id: parsed.practitionerId,
    });
    const [row] = await ctx.step.run("insert-posting", async () =>
      ctx.db
        .insert(healthcarePosting)
        .values({
          branch_id: parsed.branchId,
          facility_id: parsed.facilityId ?? null,
          from_date: parsed.from,
          id: crypto.randomUUID(),
          practitioner_id: parsed.practitionerId,
          to_date: parsed.to ?? null,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save posting.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PRACTITIONER,
        newState: {
          facilityId: row.facility_id,
          from: row.from_date,
          id: row.id,
          practitionerId: row.practitioner_id,
        },
      });
      await ctx.pubsub.publish(PRACTITIONER_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: practitioner.branch_id,
        id: parsed.practitionerId,
      });
    });
    return toPostingDto(row);
  });
