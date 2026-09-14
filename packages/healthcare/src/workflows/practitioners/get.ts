import {
  healthcareLeaveBlock,
  healthcarePosting,
  healthcarePractitionerEducation,
  healthcarePractitionerFee,
  healthcarePractitionerRegistration,
  healthcarePractitionerSchedule,
} from "#/db-schemas/practitioners";
import { PractitionerIdSchema } from "#/schemas/practitioners";
import {
  fetchPractitionerStep,
  toEducationDto,
  toFeeDto,
  toLeaveBlockDto,
  toPostingDto,
  toPractitionerDto,
  toRegistrationDto,
  toScheduleDto,
} from "#/workflow-steps/fetch-practitioner";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const GetPractitionerInputSchema = object({ input: PractitionerIdSchema });

export const getPractitioner = Workflow.name("healthcare.practitioners.get")
  .input(GetPractitionerInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PractitionerIdSchema, input);
    const practitioner = await ctx.step.run(fetchPractitionerStep, {
      id: parsed.id,
    });
    const branchId = practitioner.branch_id;
    const [registrations, education, postings, schedules, fees, leaves] = await ctx.step.run(
      "fetch-aggregate",
      async () =>
        Promise.all([
          ctx.db
            .select()
            .from(healthcarePractitionerRegistration)
            .where(
              and(
                eq(healthcarePractitionerRegistration.branch_id, branchId),
                eq(healthcarePractitionerRegistration.practitioner_id, parsed.id),
              ),
            )
            .limit(100),
          ctx.db
            .select()
            .from(healthcarePractitionerEducation)
            .where(
              and(
                eq(healthcarePractitionerEducation.branch_id, branchId),
                eq(healthcarePractitionerEducation.practitioner_id, parsed.id),
              ),
            )
            .limit(100),
          ctx.db
            .select()
            .from(healthcarePosting)
            .where(
              and(
                eq(healthcarePosting.branch_id, branchId),
                eq(healthcarePosting.practitioner_id, parsed.id),
              ),
            )
            .limit(100),
          ctx.db
            .select()
            .from(healthcarePractitionerSchedule)
            .where(
              and(
                eq(healthcarePractitionerSchedule.branch_id, branchId),
                eq(healthcarePractitionerSchedule.practitioner_id, parsed.id),
              ),
            )
            .limit(100),
          ctx.db
            .select()
            .from(healthcarePractitionerFee)
            .where(
              and(
                eq(healthcarePractitionerFee.branch_id, branchId),
                eq(healthcarePractitionerFee.practitioner_id, parsed.id),
              ),
            )
            .limit(100),
          ctx.db
            .select()
            .from(healthcareLeaveBlock)
            .where(
              and(
                eq(healthcareLeaveBlock.branch_id, branchId),
                eq(healthcareLeaveBlock.practitioner_id, parsed.id),
              ),
            )
            .limit(100),
        ]),
    );
    return {
      education: education.map(toEducationDto),
      fees: fees.map(toFeeDto),
      leaves: leaves.map(toLeaveBlockDto),
      postings: postings.map(toPostingDto),
      practitioner: toPractitionerDto(practitioner),
      registrations: registrations.map(toRegistrationDto),
      schedules: schedules.map(toScheduleDto),
    };
  });
