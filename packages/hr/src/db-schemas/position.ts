import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, date, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const hrPosition = pgTable(
  "hr_position",
  {
    branch: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    department: text().notNull(),
    designation: text(),
    employment_type: text(),
    headcount: integer().notNull().default(1),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    job_description: text(),
    name: text().notNull(),
    reports_to_position: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_hr_position_department").on(table.department),
    index("idx_hr_position_is_active").on(table.is_active),
    index("idx_hr_position_reports_to_position").on(table.reports_to_position),
  ],
);

export const hrPositionAssignment = pgTable(
  "hr_position_assignment",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    employee_id: text().notNull(),
    from_date: date().notNull(),
    id: uuidv7().primaryKey(),
    is_primary: boolean().notNull().default(false),
    position_id: text().notNull(),
    to_date: date(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_hr_position_assignment_employee_id").on(table.employee_id),
    index("idx_hr_position_assignment_position_id").on(table.position_id),
  ],
);
