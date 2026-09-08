import { uuidv7 } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { workspaceAccessEnum, workspaceDraftStatusEnum } from "./enums";

export const workspaceDraft = pgTable(
  "workspace_draft",
  {
    access: workspaceAccessEnum().notNull().default("personal"),
    approved_at: timestamp({ withTimezone: true }),
    approved_by: text(),
    body: text().notNull().default(""),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    deleted_at: timestamp({ withTimezone: true }),
    id: uuidv7().primaryKey(),
    metadata: jsonb()
      .notNull()
      .$type<Record<string, JsonValue>>()
      .default(sql`'{}'::jsonb`),
    notes: text(),
    owner_id: text().notNull(),
    published_at: timestamp({ withTimezone: true }),
    published_by: text(),
    rejected_at: timestamp({ withTimezone: true }),
    rejected_by: text(),
    rejection_reason: text(),
    status: workspaceDraftStatusEnum().notNull().default("draft"),
    submitted_at: timestamp({ withTimezone: true }),
    submitted_by: text(),
    target_domain: text(),
    target_entity_id: text(),
    target_entity_type: text(),
    title: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_workspace_draft_owner").on(table.owner_id),
    index("idx_workspace_draft_status").on(table.status),
    index("idx_workspace_draft_access").on(table.access),
  ],
);

export type WorkspaceDraft = typeof workspaceDraft.$inferSelect;
export type NewWorkspaceDraft = typeof workspaceDraft.$inferInsert;
