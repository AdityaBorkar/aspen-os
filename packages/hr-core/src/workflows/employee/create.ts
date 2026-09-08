import { employee } from "#/db-schemas";
import { CreateEmployeeSchema } from "#/types";
import { ensureEmployeeIdUnique } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateEmployeeSchema,
});

export const create = Workflow.name("hr.employee.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    // Check for unique employee ID
    await ensureEmployeeIdUnique(ctx.db, parsed.employeeId);

    const [result] = await ctx.db
      .insert(employee)
      .values({
        bank_account_number: parsed.bankAccountNumber ?? null,
        bank_branch: parsed.bankBranch ?? null,
        bank_name: parsed.bankName ?? null,
        blood_group: parsed.bloodGroup ?? null,
        branch: parsed.branch ?? null,
        city: parsed.city ?? null,
        company: parsed.company,
        country: parsed.country ?? null,
        current_address: parsed.currentAddress ?? null,
        date_of_birth: parsed.dateOfBirth ?? null,
        date_of_joining: parsed.dateOfJoining,
        date_of_leaving: parsed.dateOfLeaving ?? null,
        department: parsed.department,
        designation: parsed.designation,
        emergency_contact_name: parsed.emergencyContactName ?? null,
        emergency_contact_phone: parsed.emergencyContactPhone ?? null,
        emergency_contact_relation: parsed.emergencyContactRelation ?? null,
        employee_id: parsed.employeeId,
        employment_type: parsed.employmentType,
        first_name: parsed.firstName,
        gender: parsed.gender ?? null,
        grade: parsed.grade ?? null,
        holiday_list: parsed.holidayList ?? null,
        ifsc_code: parsed.ifscCode ?? null,
        image: parsed.image ?? null,
        last_name: parsed.lastName,
        marital_status: parsed.maritalStatus ?? null,
        metadata: parsed.metadata ?? null,
        middle_name: parsed.middleName ?? null,
        permanent_address: parsed.permanentAddress ?? null,
        personal_email: parsed.personalEmail ?? null,
        personal_phone: parsed.personalPhone ?? null,
        postal_code: parsed.postalCode ?? null,
        reports_to: parsed.reportsTo ?? null,
        salary_structure_assignment: parsed.salaryStructureAssignment ?? null,
        social_security_number: parsed.socialSecurityNumber ?? null,
        state: parsed.state ?? null,
        tax_id: parsed.taxId ?? null,
        work_email: parsed.workEmail ?? null,
        work_phone: parsed.workPhone ?? null,
      })
      .returning();

    return result;
  });
