import type { ScheduleConfig } from "#/schemas/schedule";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const workspaceSchedule = pgTable(
  "workspace_schedule",
  {
    config: jsonb("config").notNull().$type<ScheduleConfig>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").notNull(),
    cron: text("cron").notNull(),
    dashboardId: text("dashboard_id").notNull(),
    id: uuidv7("id").primaryKey(),
    isActive: boolean("is_active").notNull().default(true),
    lastError: text("last_error"),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_workspace_schedule_dashboard").on(table.dashboardId)],
);

export type WorkspaceSchedule = typeof workspaceSchedule.$inferSelect;
export type NewWorkspaceSchedule = typeof workspaceSchedule.$inferInsert;
