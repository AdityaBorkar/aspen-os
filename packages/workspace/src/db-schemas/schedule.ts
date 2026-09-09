import type { ScheduleConfig } from "#/schemas/schedule";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const workspaceDeliverySchedule = pgTable(
  "workspace_delivery_schedule",
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
  (table) => [index("idx_workspace_delivery_schedule_dashboard").on(table.dashboard_id)],
);

export type WorkspaceDeliverySchedule = typeof workspaceDeliverySchedule.$inferSelect;
export type NewWorkspaceDeliverySchedule = typeof workspaceDeliverySchedule.$inferInsert;
export type WorkspaceSchedule = WorkspaceDeliverySchedule;
export type NewWorkspaceSchedule = NewWorkspaceDeliverySchedule;
