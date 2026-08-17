import { automationTriggerEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const automationRule = pgTable(
  "task_automation_rule",
  {
    actions: jsonb("actions").notNull(),
    conditions: jsonb("conditions"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuidv7("id").primaryKey(),
    isActive: boolean("is_active").notNull().default(true),
    name: text("name").notNull(),
    projectId: text("project_id").notNull(),
    trigger: automationTriggerEnum("trigger").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_task_automation_rule_project").on(table.projectId),
    index("idx_task_automation_rule_trigger").on(table.trigger),
    index("idx_task_automation_rule_active").on(table.isActive),
  ],
);

export type AutomationRule = typeof automationRule.$inferSelect;
export type NewAutomationRule = typeof automationRule.$inferInsert;
