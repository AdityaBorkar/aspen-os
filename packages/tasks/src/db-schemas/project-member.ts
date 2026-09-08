import { projectMemberRoleEnum } from "#/db-schemas/enums";

import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const projectMember = pgTable(
  "task_project_member",
  {
    joined_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    project_id: text().notNull(),
    role: projectMemberRoleEnum().notNull().default("member"),
    user_id: text().notNull(),
  },
  (table) => [
    uniqueIndex("uq_task_project_member_project_user").on(table.project_id, table.user_id),
    index("idx_task_project_member_project").on(table.project_id),
    index("idx_task_project_member_user").on(table.user_id),
  ],
);

export type ProjectMember = typeof projectMember.$inferSelect;
export type NewProjectMember = typeof projectMember.$inferInsert;
