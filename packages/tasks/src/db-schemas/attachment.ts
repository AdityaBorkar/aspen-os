import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const attachment = pgTable(
  "task_attachment",
  {
    commentId: text("comment_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    fileId: text("file_id").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    taskId: text("task_id").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
  },
  (table) => [
    index("idx_task_attachment_task").on(table.taskId),
    index("idx_task_attachment_comment").on(table.commentId),
  ],
);

export type Attachment = typeof attachment.$inferSelect;
export type NewAttachment = typeof attachment.$inferInsert;
