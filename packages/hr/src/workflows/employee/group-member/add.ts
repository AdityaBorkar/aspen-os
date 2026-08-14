import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { employeeGroupMember } from "../../../db-schemas";
import { AddGroupMemberSchema } from "../../../types";
import { fetchEmployeeById, fetchEmployeeGroupById } from "../../utils";

const InputSchema = object({
  input: AddGroupMemberSchema,
});

export const addGroupMember = Workflow.name("hr.employee.add-group-member")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AddGroupMemberSchema, input);

    // Verify employee exists
    await fetchEmployeeById(ctx.db, parsed.employeeId);

    // Verify group exists
    await fetchEmployeeGroupById(ctx.db, parsed.groupId);

    // Check if already a member
    const [existing] = await ctx.db
      .select()
      .from(employeeGroupMember)
      .where(
        and(
          eq(employeeGroupMember.groupId, parsed.groupId),
          eq(employeeGroupMember.employeeId, parsed.employeeId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new Error("Employee is already a member of this group.");
    }

    const [result] = await ctx.db
      .insert(employeeGroupMember)
      .values({
        employeeId: parsed.employeeId,
        groupId: parsed.groupId,
      })
      .returning();

    return result;
  });
