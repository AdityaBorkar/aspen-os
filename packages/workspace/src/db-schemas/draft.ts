import { uuidv7 } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { workspaceAccessEnum, workspaceDraftStatusEnum } from "./enums";

export const workspaceDraft = pgTable(
  "workspace_draft",
  {
    access: workspaceAccessEnum("access").notNull().default("personal"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    metadata: jsonb("metadata")
      .notNull()
      .$type<Record<string, JsonValue>>()
      .default(sql`'{}'::jsonb`),
    notes: text("notes"),
    ownerId: text("owner_id").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedBy: text("published_by"),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: text("rejected_by"),
    rejectionReason: text("rejection_reason"),
    status: workspaceDraftStatusEnum("status").notNull().default("draft"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedBy: text("submitted_by"),
    targetDomain: text("target_domain"),
    targetEntityId: text("target_entity_id"),
    targetEntityType: text("target_entity_type"),
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_workspace_draft_owner").on(table.ownerId),
    index("idx_workspace_draft_status").on(table.status),
    index("idx_workspace_draft_access").on(table.access),
  ],
);

export type WorkspaceDraft = typeof workspaceDraft.$inferSelect;
export type NewWorkspaceDraft = typeof workspaceDraft.$inferInsert;
