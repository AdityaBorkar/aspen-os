import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const workspaceDraftComment = pgTable(
  "workspace_draft_comment",
  {
    author_id: text().notNull(),
    content: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    draft_id: text().notNull(),
    id: uuidv7().primaryKey(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_workspace_draft_comment_draft").on(table.draft_id)],
);

export type WorkspaceDraftComment = typeof workspaceDraftComment.$inferSelect;
export type NewWorkspaceDraftComment = typeof workspaceDraftComment.$inferInsert;
