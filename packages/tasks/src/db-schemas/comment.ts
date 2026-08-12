import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const comment = pgTable(
  "task_comment",
  {
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isDeleted: boolean("is_deleted").notNull().default(false),
    parentId: text("parent_id"),
    taskId: text("task_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_task_comment_task").on(table.taskId),
    index("idx_task_comment_parent").on(table.parentId),
    index("idx_task_comment_user").on(table.userId),
  ],
);

export type Comment = typeof comment.$inferSelect;
export type NewComment = typeof comment.$inferInsert;
