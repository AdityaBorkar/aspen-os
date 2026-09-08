import type { FilterViewCondition, FilterViewSort } from "#/schemas/filter-view";

import { uuidv7 } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { masterFilterViewAccessEnum, masterFilterViewTypeEnum } from "./enums";

export const masterFilterView = pgTable(
  "master_filter_view",
  {
    access: masterFilterViewAccessEnum().notNull().default("personal"),
    conditions: jsonb()
      .notNull()
      .$type<FilterViewCondition[]>()
      .default(sql`'[]'::jsonb`),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    domain: text().notNull(),
    group_by: text(),
    id: uuidv7().primaryKey(),
    is_default: boolean().notNull().default(false),
    metadata: jsonb().$type<Record<string, JsonValue>>(),
    name: text().notNull(),
    owner_id: text().notNull(),
    project_id: text(),
    sort: jsonb()
      .notNull()
      .$type<FilterViewSort[]>()
      .default(sql`'[]'::jsonb`),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    view_type: masterFilterViewTypeEnum().notNull().default("list"),
  },
  (table) => [
    index("idx_master_filter_view_domain_access").on(table.domain, table.access),
    index("idx_master_filter_view_owner").on(table.owner_id),
    index("idx_master_filter_view_project").on(table.project_id),
  ],
);

export type MasterFilterView = typeof masterFilterView.$inferSelect;
export type NewMasterFilterView = typeof masterFilterView.$inferInsert;
