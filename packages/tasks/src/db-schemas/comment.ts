import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const comment = pgTable(
  "task_comment",
  {
    body: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    edited_at: timestamp({ withTimezone: true }),
    id: uuidv7().primaryKey(),
    is_deleted: boolean().notNull().default(false),
    parent_id: text(),
    task_id: text().notNull(),
    user_id: text().notNull(),
  },
  (table) => [
    index("idx_task_comment_task").on(table.task_id),
    index("idx_task_comment_parent").on(table.parent_id),
    index("idx_task_comment_user").on(table.user_id),
  ],
);

export type Comment = typeof comment.$inferSelect;
export type NewComment = typeof comment.$inferInsert;
