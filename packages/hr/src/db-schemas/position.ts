import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, date, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const hrPosition = pgTable(
  "hr_position",
  {
    branch: text("branch"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    department: text("department").notNull(),
    designation: text("designation"),
    employmentType: text("employment_type"),
    headcount: integer("headcount").notNull().default(1),
    id: uuidv7("id").primaryKey(),
    isActive: boolean("is_active").notNull().default(true),
    jobDescription: text("job_description"),
    name: text("name").notNull(),
    reportsToPosition: text("reports_to_position"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_hr_position_department").on(table.department),
    index("idx_hr_position_is_active").on(table.isActive),
    index("idx_hr_position_reports_to_position").on(table.reportsToPosition),
  ],
);

export const hrPositionAssignment = pgTable(
  "hr_position_assignment",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    employeeId: text("employee_id").notNull(),
    fromDate: date("from_date").notNull(),
    id: uuidv7("id").primaryKey(),
    isPrimary: boolean("is_primary").notNull().default(false),
    positionId: text("position_id").notNull(),
    toDate: date("to_date"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_hr_position_assignment_employee_id").on(table.employeeId),
    index("idx_hr_position_assignment_position_id").on(table.positionId),
  ],
);
