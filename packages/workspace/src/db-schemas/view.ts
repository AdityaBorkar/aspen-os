import type { ViewCondition, ViewSort } from "#/schemas/view";

import { uuidv7 } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { workspaceAccessEnum } from "./enums";

export const workspaceView = pgTable(
  "workspace_view",
  {
    access: workspaceAccessEnum("access").notNull().default("personal"),
    conditions: jsonb("conditions")
      .notNull()
      .$type<ViewCondition[]>()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    domain: text("domain").notNull(),
    groupBy: text("group_by"),
    id: uuidv7("id").primaryKey(),
    isDefault: boolean("is_default").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>(),
    name: text("name").notNull(),
    ownerId: text("owner_id").notNull(),
    sort: jsonb("sort")
      .notNull()
      .$type<ViewSort[]>()
      .default(sql`'[]'::jsonb`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_workspace_view_domain_access").on(table.domain, table.access),
    index("idx_workspace_view_owner").on(table.ownerId),
  ],
);

export type WorkspaceView = typeof workspaceView.$inferSelect;
export type NewWorkspaceView = typeof workspaceView.$inferInsert;
