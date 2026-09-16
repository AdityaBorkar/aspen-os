import { announcement } from "#/db-schemas";
import { AnnouncementFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { object, optional } from "valibot";

const InputSchema = object({
  filters: optional(AnnouncementFiltersSchema, {}),
});

export const listAnnouncement = Workflow.name("announcement.list")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters;
    const conditions = [];

    if (parsed.author) {
      conditions.push(eq(announcement.author, parsed.author));
    }
    if (parsed.status) {
      conditions.push(eq(announcement.status, parsed.status));
    }
    if (parsed.priority) {
      conditions.push(eq(announcement.priority, parsed.priority));
    }
    if (parsed.pinned !== undefined) {
      conditions.push(eq(announcement.pinned, parsed.pinned));
    }
    if (parsed.fromDate) {
      conditions.push(gte(announcement.created_at, new Date(parsed.fromDate)));
    }
    if (parsed.toDate) {
      conditions.push(lte(announcement.created_at, new Date(parsed.toDate)));
    }
    if (parsed.q) {
      const pattern = `%${parsed.q}%`;
      conditions.push(
        sql`(${announcement.title} ILIKE ${pattern} OR ${announcement.body} ILIKE ${pattern})`,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db
      .select()
      .from(announcement)
      .where(whereClause)
      .orderBy(desc(announcement.pinned), desc(announcement.created_at));
  });
