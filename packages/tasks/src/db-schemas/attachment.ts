import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const attachment = pgTable(
  "task_attachment",
  {
    comment_id: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    file_id: text().notNull(),
    id: uuidv7().primaryKey(),
    task_id: text().notNull(),
    uploaded_by: text().notNull(),
  },
  (table) => [
    index("idx_task_attachment_task").on(table.task_id),
    index("idx_task_attachment_comment").on(table.comment_id),
  ],
);

export type Attachment = typeof attachment.$inferSelect;
export type NewAttachment = typeof attachment.$inferInsert;
