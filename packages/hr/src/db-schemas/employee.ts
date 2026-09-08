import {
  checkinLogTypeEnum,
  employeeStatusEnum,
  employmentTypeEnum,
  genderEnum,
  onboardingStatusEnum,
  promotionStatusEnum,
  separationStatusEnum,
  skillProficiencyEnum,
  transferStatusEnum,
} from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, date, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const employee = pgTable(
  "employee",
  {
    bank_account_number: text(),
    bank_branch: text(),
    bank_name: text(),
    blood_group: text(),
    branch: text(),
    city: text(),
    company: text().notNull(),
    country: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    current_address: text(),
    date_of_birth: date(),
    date_of_joining: date().notNull(),
    date_of_leaving: date(),
    department: text().notNull(),
    designation: text().notNull(),
    email: text(),
    emergency_contact_name: text(),
    emergency_contact_phone: text(),
    emergency_contact_relation: text(),
    employee_id: text().notNull(),
    employment_type: employmentTypeEnum().notNull(),
    first_name: text().notNull(),
    gender: genderEnum(),
    grade: text(),
    holiday_list: text(),
    id: uuidv7().primaryKey(),
    ifsc_code: text(),
    image: text(),
    last_name: text().notNull(),
    marital_status: text(),
    metadata: jsonb(),
    middle_name: text(),
    permanent_address: text(),
    personal_email: text(),
    personal_phone: text(),
    phone: text(),
    postal_code: text(),
    reports_to: text(),
    salary_structure_assignment: text(),
    social_security_number: text(),
    state: text(),
    status: employeeStatusEnum().notNull().default("active"),
    tax_id: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    work_email: text(),
    work_phone: text(),
  },
  (table) => [
    index("idx_employee_employee_id").on(table.employee_id),
    index("idx_employee_company").on(table.company),
    index("idx_employee_status").on(table.status),
  ],
);

export const employeeGroup = pgTable("employee_group", {
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  description: text(),
  id: uuidv7().primaryKey(),
  is_active: boolean().notNull().default(true),
  name: text().notNull(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const employeeGroupMember = pgTable(
  "employee_group_member",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    employee_id: text().notNull(),
    group_id: text().notNull(),
    id: uuidv7().primaryKey(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_employee_group_member_group_id").on(table.group_id),
    index("idx_employee_group_member_employee_id").on(table.employee_id),
  ],
);

export const employeeHealthInsurance = pgTable(
  "employee_health_insurance",
  {
    coverage_details: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    employee_id: text().notNull(),
    end_date: date(),
    id: uuidv7().primaryKey(),
    insurer: text().notNull(),
    is_active: boolean().notNull().default(true),
    metadata: jsonb(),
    policy_number: text().notNull(),
    premium_amount: text(),
    start_date: date().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_employee_health_insurance_employee_id").on(table.employee_id)],
);

export const employeeSkillMap = pgTable(
  "employee_skill_map",
  {
    assessed_by: text(),
    assessment_date: date(),
    certification_date: date(),
    certification_name: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    employee_id: text().notNull(),
    expiry_date: date(),
    id: uuidv7().primaryKey(),
    notes: text(),
    proficiency: skillProficiencyEnum().notNull(),
    skill: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_employee_skill_map_employee_id").on(table.employee_id)],
);

export const employeeCheckin = pgTable(
  "employee_checkin",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    device_id: text(),
    employee_id: text().notNull(),
    id: uuidv7().primaryKey(),
    is_off_shift: boolean().notNull().default(false),
    latitude: text(),
    log_type: checkinLogTypeEnum().notNull(),
    longitude: text(),
    metadata: jsonb(),
    shift: text(),
    time: timestamp({ withTimezone: true }).notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_employee_checkin_employee_id").on(table.employee_id)],
);

export const employeeOnboarding = pgTable(
  "employee_onboarding",
  {
    actual_completion_date: date(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    employee_id: text().notNull(),
    expected_completion_date: date(),
    id: uuidv7().primaryKey(),
    metadata: jsonb(),
    notes: text(),
    start_date: date().notNull(),
    status: onboardingStatusEnum().notNull().default("pending"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_employee_onboarding_employee_id").on(table.employee_id),
    index("idx_employee_onboarding_status").on(table.status),
  ],
);

export const employeePromotion = pgTable(
  "employee_promotion",
  {
    approved_at: timestamp({ withTimezone: true }),
    approved_by: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    current_department: text(),
    current_designation: text().notNull(),
    current_grade: text(),
    effective_date: date().notNull(),
    employee_id: text().notNull(),
    id: uuidv7().primaryKey(),
    new_department: text(),
    new_designation: text().notNull(),
    new_grade: text(),
    reason: text(),
    rejected_at: timestamp({ withTimezone: true }),
    rejected_by: text(),
    rejection_reason: text(),
    salary_revision: text(),
    status: promotionStatusEnum().notNull().default("pending"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_employee_promotion_employee_id").on(table.employee_id),
    index("idx_employee_promotion_status").on(table.status),
  ],
);

export const employeeSeparation = pgTable(
  "employee_separation",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    employee_id: text().notNull(),
    exit_date: date().notNull(),
    id: uuidv7().primaryKey(),
    metadata: jsonb(),
    notes: text(),
    reason: text(),
    resignation_date: date(),
    status: separationStatusEnum().notNull().default("pending"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_employee_separation_employee_id").on(table.employee_id),
    index("idx_employee_separation_status").on(table.status),
  ],
);

export const employeeTransfer = pgTable(
  "employee_transfer",
  {
    approved_at: timestamp({ withTimezone: true }),
    approved_by: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    effective_date: date().notNull(),
    employee_id: text().notNull(),
    from_branch: text(),
    from_company: text(),
    from_department: text(),
    id: uuidv7().primaryKey(),
    reason: text(),
    rejected_at: timestamp({ withTimezone: true }),
    rejected_by: text(),
    rejection_reason: text(),
    status: transferStatusEnum().notNull().default("pending"),
    to_branch: text(),
    to_company: text(),
    to_department: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_employee_transfer_employee_id").on(table.employee_id),
    index("idx_employee_transfer_status").on(table.status),
  ],
);
