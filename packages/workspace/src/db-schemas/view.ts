import type { ViewCondition, ViewSort } from "#/schemas/view";

import { uuidv7 } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { workspaceAccessEnum } from "./enums";

export const workspaceView = pgTable(
  "workspace_view",
  {
    access: workspaceAccessEnum().notNull().default("personal"),
    conditions: jsonb()
      .notNull()
      .$type<ViewCondition[]>()
      .default(sql`'[]'::jsonb`),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    domain: text().notNull(),
    group_by: text(),
    id: uuidv7().primaryKey(),
    is_default: boolean().notNull().default(false),
    metadata: jsonb().$type<Record<string, JsonValue>>(),
    name: text().notNull(),
    owner_id: text().notNull(),
    sort: jsonb()
      .notNull()
      .$type<ViewSort[]>()
      .default(sql`'[]'::jsonb`),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_workspace_view_domain_access").on(table.domain, table.access),
    index("idx_workspace_view_owner").on(table.owner_id),
  ],
);

export type WorkspaceView = typeof workspaceView.$inferSelect;
export type NewWorkspaceView = typeof workspaceView.$inferInsert;
