import { employee } from "#/db-schemas";
import { CreateEmployeeSchema } from "#/types";
import { ensureEmployeeIdUnique } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({
  input: CreateEmployeeSchema,
});

export const create = Workflow.name("hr.employee.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateEmployeeSchema, input);

    // Check for unique employee ID
    await ensureEmployeeIdUnique(ctx.db, parsed.employeeId);

    const [result] = await ctx.db
      .insert(employee)
      .values({
        bankAccountNumber: parsed.bankAccountNumber ?? null,
        bankBranch: parsed.bankBranch ?? null,
        bankName: parsed.bankName ?? null,
        bloodGroup: parsed.bloodGroup ?? null,
        branch: parsed.branch ?? null,
        city: parsed.city ?? null,
        company: parsed.company,
        country: parsed.country ?? null,
        currentAddress: parsed.currentAddress ?? null,
        dateOfBirth: parsed.dateOfBirth ?? null,
        dateOfJoining: parsed.dateOfJoining,
        dateOfLeaving: parsed.dateOfLeaving ?? null,
        department: parsed.department,
        designation: parsed.designation,
        emergencyContactName: parsed.emergencyContactName ?? null,
        emergencyContactPhone: parsed.emergencyContactPhone ?? null,
        emergencyContactRelation: parsed.emergencyContactRelation ?? null,
        employeeId: parsed.employeeId,
        employmentType: parsed.employmentType,
        firstName: parsed.firstName,
        gender: parsed.gender ?? null,
        grade: parsed.grade ?? null,
        holidayList: parsed.holidayList ?? null,
        ifscCode: parsed.ifscCode ?? null,
        image: parsed.image ?? null,
        lastName: parsed.lastName,
        maritalStatus: parsed.maritalStatus ?? null,
        metadata: parsed.metadata ?? null,
        middleName: parsed.middleName ?? null,
        permanentAddress: parsed.permanentAddress ?? null,
        personalEmail: parsed.personalEmail ?? null,
        personalPhone: parsed.personalPhone ?? null,
        postalCode: parsed.postalCode ?? null,
        reportsTo: parsed.reportsTo ?? null,
        salaryStructureAssignment: parsed.salaryStructureAssignment ?? null,
        socialSecurityNumber: parsed.socialSecurityNumber ?? null,
        state: parsed.state ?? null,
        taxId: parsed.taxId ?? null,
        workEmail: parsed.workEmail ?? null,
        workPhone: parsed.workPhone ?? null,
      })
      .returning();

    return result;
  });
