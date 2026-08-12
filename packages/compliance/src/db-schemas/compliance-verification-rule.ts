import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { complianceCategoryEnum } from "./enums";

export const complianceVerificationRule = pgTable(
  "compliance_verification_rule",
  {
    assignedReviewer: text("assigned_reviewer"),
    category: complianceCategoryEnum("category"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isActive: boolean("is_active").notNull().default(true),
    name: text("name").notNull(),
    priority: integer("priority").notNull().default(0),
    requiredReviewerRole: text("required_reviewer_role"),
    sourceModule: text("source_module"),
  },
  (table) => [
    index("idx_compliance_verification_rule_active").on(table.isActive),
    index("idx_compliance_verification_rule_category").on(table.category),
    index("idx_compliance_verification_rule_priority").on(table.priority),
  ],
);

export type ComplianceVerificationRule =
  typeof complianceVerificationRule.$inferSelect;
export type NewComplianceVerificationRule =
  typeof complianceVerificationRule.$inferInsert;
