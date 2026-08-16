import type { ViewCondition } from "#/schemas/view";
import type { WidgetConfig } from "#/schemas/widget";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { workspaceWidgetTypeEnum } from "./enums";

export const workspaceWidget = pgTable(
  "workspace_widget",
  {
    config: jsonb("config").notNull().$type<WidgetConfig>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    dashboardId: text("dashboard_id").notNull(),
    domain: text("domain"),
    filter: jsonb("filter").$type<ViewCondition[]>(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    lastError: text("last_error"),
    lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }),
    title: text("title").notNull(),
    type: workspaceWidgetTypeEnum("type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    viewId: text("view_id"),
  },
  (table) => [index("idx_workspace_widget_dashboard").on(table.dashboardId)],
);

export type WorkspaceWidget = typeof workspaceWidget.$inferSelect;
export type NewWorkspaceWidget = typeof workspaceWidget.$inferInsert;
