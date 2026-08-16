import type { WidgetPlacement } from "#/schemas/widget";

import { uuidv7 } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { workspaceAccessEnum } from "./enums";

export const workspaceDashboard = pgTable(
  "workspace_dashboard",
  {
    access: workspaceAccessEnum("access").notNull().default("personal"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    description: text("description"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    layout: jsonb("layout")
      .notNull()
      .$type<WidgetPlacement[]>()
      .default(sql`'[]'::jsonb`),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>(),
    name: text("name").notNull(),
    ownerId: text("owner_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_workspace_dashboard_owner").on(table.ownerId),
    index("idx_workspace_dashboard_access").on(table.access),
  ],
);

export type WorkspaceDashboard = typeof workspaceDashboard.$inferSelect;
export type NewWorkspaceDashboard = typeof workspaceDashboard.$inferInsert;
