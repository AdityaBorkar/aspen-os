import { complianceCategoryEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const complianceVerificationRule = pgTable(
  "compliance_verification_rule",
  {
    assigned_reviewer: text(),
    category: complianceCategoryEnum(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    name: text().notNull(),
    priority: integer().notNull().default(0),
    required_reviewer_role: text(),
    source_module: text(),
  },
  (table) => [
    index("idx_compliance_verification_rule_active").on(table.is_active),
    index("idx_compliance_verification_rule_category").on(table.category),
    index("idx_compliance_verification_rule_priority").on(table.priority),
  ],
);

export type ComplianceVerificationRule = typeof complianceVerificationRule.$inferSelect;
export type NewComplianceVerificationRule = typeof complianceVerificationRule.$inferInsert;
