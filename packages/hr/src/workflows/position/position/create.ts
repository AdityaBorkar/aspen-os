import { hrPosition } from "#/db-schemas";
import { POSITION_EVENTS } from "#/pubsub";
import { CreatePositionSchema } from "#/types";
import {
  ensurePositionNameUnique,
  fetchPositionById,
  validatePositionReportsTo,
} from "#/utils/position-utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({
  input: CreatePositionSchema,
});

export const createPosition = Workflow.name("hr.position.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePositionSchema, input);

    await ensurePositionNameUnique(ctx.db, {
      department: parsed.department,
      name: parsed.name,
    });

    if (parsed.reportsToPosition) {
      await fetchPositionById(ctx.db, parsed.reportsToPosition);
      await validatePositionReportsTo(ctx.db, parsed.reportsToPosition);
    }

    const [result] = await ctx.db
      .insert(hrPosition)
      .values({
        branch: parsed.branch ?? null,
        department: parsed.department,
        designation: parsed.designation ?? null,
        employmentType: parsed.employmentType ?? null,
        headcount: parsed.headcount,
        jobDescription: parsed.jobDescription ?? null,
        name: parsed.name,
        reportsToPosition: parsed.reportsToPosition ?? null,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create position.");
    }

    await ctx.pubsub.publish(POSITION_EVENTS.CREATED, {
      position: { department: result.department, id: result.id, name: result.name },
    });

    return result;
  });
