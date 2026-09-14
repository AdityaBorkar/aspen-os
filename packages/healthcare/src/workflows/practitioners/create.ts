import { healthcarePractitioner } from "#/db-schemas/practitioners";
import { PRACTITIONER_EVENTS } from "#/pubsub";
import { CreatePractitionerSchema } from "#/schemas/practitioners";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toPractitionerDto } from "#/workflow-steps/fetch-practitioner";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreatePractitionerInputSchema = object({ input: CreatePractitionerSchema });

export const createPractitioner = Workflow.name("healthcare.practitioners.create")
  .input(CreatePractitionerInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePractitionerSchema, input);
    if (
      parsed.specialistYrs !== undefined &&
      parsed.overallYrs !== undefined &&
      parsed.specialistYrs > parsed.overallYrs
    ) {
      throw new Error(
        `Specialist years (${parsed.specialistYrs}) cannot exceed overall years (${parsed.overallYrs}).`,
      );
    }
    const { branchId } = parsed;
    const staffNo = await ctx.step.run(nextHealthcareSeries, {
      input: { series: "practitioner" },
    });
    const [row] = await ctx.step.run("insert-practitioner", async () =>
      ctx.db
        .insert(healthcarePractitioner)
        .values({
          branch_id: branchId,
          email: parsed.email ?? null,
          id: crypto.randomUUID(),
          languages: parsed.languages ?? [],
          name: parsed.name,
          overall_yrs: parsed.overallYrs ?? null,
          payload: { staffCode: `DOC-${staffNo}` },
          phone: parsed.phone ?? null,
          specialist_yrs: parsed.specialistYrs ?? null,
          specialty: parsed.specialty ?? null,
          status: "active",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to create practitioner.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PRACTITIONER,
        newState: {
          branchId: row.branch_id,
          id: row.id,
          name: row.name,
          specialty: row.specialty,
          status: row.status,
        },
      });
      await ctx.pubsub.publish(PRACTITIONER_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });
    return toPractitionerDto(row);
  });
