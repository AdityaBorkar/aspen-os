import { healthcarePractitionerRegistration } from "#/db-schemas/practitioners";
import { PRACTITIONER_EVENTS } from "#/pubsub";
import { CreateRegistrationSchema } from "#/schemas/practitioners";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPractitionerStep, toRegistrationDto } from "#/workflow-steps/fetch-practitioner";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const AddRegistrationInputSchema = object({ input: CreateRegistrationSchema });

export const addPractitionerRegistration = Workflow.name(
  "healthcare.practitioners.add-registration",
)
  .input(AddRegistrationInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateRegistrationSchema, input);
    const practitioner = await ctx.step.run(fetchPractitionerStep, {
      id: parsed.practitionerId,
    });
    const { branchId } = parsed;
    const duplicate = await ctx.step.run("check-duplicate", async () => {
      const [existing] = await ctx.db
        .select({ id: healthcarePractitionerRegistration.id })
        .from(healthcarePractitionerRegistration)
        .where(
          and(
            eq(healthcarePractitionerRegistration.branch_id, branchId),
            eq(healthcarePractitionerRegistration.practitioner_id, parsed.practitionerId),
            eq(healthcarePractitionerRegistration.council, parsed.council),
            eq(healthcarePractitionerRegistration.reg_no, parsed.regNo),
          ),
        )
        .limit(1);
      return existing;
    });
    if (duplicate) {
      throw new Error(
        `Registration ${parsed.regNo} with ${parsed.council} already exists for this practitioner.`,
      );
    }
    const [row] = await ctx.step.run("insert-registration", async () =>
      ctx.db
        .insert(healthcarePractitionerRegistration)
        .values({
          branch_id: branchId,
          council: parsed.council,
          id: crypto.randomUUID(),
          practitioner_id: parsed.practitionerId,
          reg_no: parsed.regNo,
          year: parsed.year ?? null,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save registration.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PRACTITIONER,
        newState: {
          council: row.council,
          id: row.id,
          practitionerId: row.practitioner_id,
          regNo: row.reg_no,
        },
      });
      await ctx.pubsub.publish(PRACTITIONER_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: practitioner.branch_id,
        id: parsed.practitionerId,
      });
    });
    return toRegistrationDto(row);
  });
