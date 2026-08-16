import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const workspaceDraftComment = pgTable(
  "workspace_draft_comment",
  {
    authorId: text("author_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    draftId: text("draft_id").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_workspace_draft_comment_draft").on(table.draftId)],
);

export type WorkspaceDraftComment = typeof workspaceDraftComment.$inferSelect;
export type NewWorkspaceDraftComment = typeof workspaceDraftComment.$inferInsert;
