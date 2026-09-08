import type { ScheduleConfig } from "#/schemas/schedule";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const workspaceSchedule = pgTable(
  "workspace_schedule",
  {
    config: jsonb().notNull().$type<ScheduleConfig>(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    cron: text().notNull(),
    dashboard_id: text().notNull(),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    last_error: text(),
    last_run_at: timestamp({ withTimezone: true }),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_workspace_schedule_dashboard").on(table.dashboard_id)],
);

export type WorkspaceSchedule = typeof workspaceSchedule.$inferSelect;
export type NewWorkspaceSchedule = typeof workspaceSchedule.$inferInsert;
