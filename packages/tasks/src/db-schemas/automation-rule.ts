import { automationTriggerEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const automationRule = pgTable(
  "task_automation_rule",
  {
    actions: jsonb().notNull(),
    conditions: jsonb(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    name: text().notNull(),
    project_id: text().notNull(),
    trigger: automationTriggerEnum().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_task_automation_rule_project").on(table.project_id),
    index("idx_task_automation_rule_trigger").on(table.trigger),
    index("idx_task_automation_rule_active").on(table.is_active),
  ],
);

export type AutomationRule = typeof automationRule.$inferSelect;
export type NewAutomationRule = typeof automationRule.$inferInsert;
