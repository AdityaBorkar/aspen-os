import type { ViewCondition } from "#/schemas/view";
import type { WidgetConfig } from "#/schemas/widget";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { workspaceWidgetTypeEnum } from "./enums";

export const workspaceWidget = pgTable(
  "workspace_widget",
  {
    config: jsonb().notNull().$type<WidgetConfig>(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    dashboard_id: text().notNull(),
    domain: text(),
    filter: jsonb().$type<ViewCondition[]>(),
    id: uuidv7().primaryKey(),
    last_error: text(),
    last_refreshed_at: timestamp({ withTimezone: true }),
    title: text().notNull(),
    type: workspaceWidgetTypeEnum().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    view_id: text(),
  },
  (table) => [index("idx_workspace_widget_dashboard").on(table.dashboard_id)],
);

export type WorkspaceWidget = typeof workspaceWidget.$inferSelect;
export type NewWorkspaceWidget = typeof workspaceWidget.$inferInsert;
