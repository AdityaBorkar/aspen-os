import { taskLinkTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const taskLink = pgTable(
  "task_link",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    link_type: taskLinkTypeEnum().notNull(),
    source_id: text().notNull(),
    target_id: text().notNull(),
  },
  (table) => [
    uniqueIndex("uq_task_link_source_target_type").on(
      table.source_id,
      table.target_id,
      table.link_type,
    ),
    index("idx_task_link_source").on(table.source_id),
    index("idx_task_link_target").on(table.target_id),
  ],
);

export type TaskLink = typeof taskLink.$inferSelect;
export type NewTaskLink = typeof taskLink.$inferInsert;
