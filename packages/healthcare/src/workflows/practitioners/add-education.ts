import { healthcarePractitionerEducation } from "#/db-schemas/practitioners";
import { PRACTITIONER_EVENTS } from "#/pubsub";
import { CreateEducationSchema } from "#/schemas/practitioners";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPractitionerStep, toEducationDto } from "#/workflow-steps/fetch-practitioner";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const AddEducationInputSchema = object({ input: CreateEducationSchema });

export const addPractitionerEducation = Workflow.name("healthcare.practitioners.add-education")
  .input(AddEducationInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateEducationSchema, input);
    const practitioner = await ctx.step.run(fetchPractitionerStep, {
      id: parsed.practitionerId,
    });
    const [row] = await ctx.step.run("insert-education", async () =>
      ctx.db
        .insert(healthcarePractitionerEducation)
        .values({
          branch_id: parsed.branchId,
          degree: parsed.degree,
          id: crypto.randomUUID(),
          institute: parsed.institute ?? null,
          practitioner_id: parsed.practitionerId,
          year: parsed.year ?? null,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save education.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PRACTITIONER,
        newState: {
          degree: row.degree,
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
    return toEducationDto(row);
  });
