import type { WidgetPlacement } from "#/schemas/widget";

import { uuidv7 } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { workspaceAccessEnum } from "./enums";

export const workspaceDashboard = pgTable(
  "workspace_dashboard",
  {
    access: workspaceAccessEnum().notNull().default("personal"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    description: text(),
    id: uuidv7().primaryKey(),
    layout: jsonb()
      .notNull()
      .$type<WidgetPlacement[]>()
      .default(sql`'[]'::jsonb`),
    metadata: jsonb().$type<Record<string, JsonValue>>(),
    name: text().notNull(),
    owner_id: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_workspace_dashboard_owner").on(table.owner_id),
    index("idx_workspace_dashboard_access").on(table.access),
  ],
);

export type WorkspaceDashboard = typeof workspaceDashboard.$inferSelect;
export type NewWorkspaceDashboard = typeof workspaceDashboard.$inferInsert;
