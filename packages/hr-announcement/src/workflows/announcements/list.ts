import { hrAnnouncement } from "#/db-schemas";
import { AnnouncementFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { object, optional } from "valibot";

const InputSchema = object({
  filters: optional(AnnouncementFiltersSchema, {}),
});

export const listAnnouncements = Workflow.name("hr.announcements.list")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters;
    const conditions = [];

    if (parsed.author) {
      conditions.push(eq(hrAnnouncement.author, parsed.author));
    }
    if (parsed.channel) {
      conditions.push(eq(hrAnnouncement.channel, parsed.channel));
    }
    if (parsed.status) {
      conditions.push(eq(hrAnnouncement.status, parsed.status));
    }
    if (parsed.priority) {
      conditions.push(eq(hrAnnouncement.priority, parsed.priority));
    }
    if (parsed.pinned !== undefined) {
      conditions.push(eq(hrAnnouncement.pinned, parsed.pinned));
    }
    if (parsed.fromDate) {
      conditions.push(gte(hrAnnouncement.created_at, new Date(parsed.fromDate)));
    }
    if (parsed.toDate) {
      conditions.push(lte(hrAnnouncement.created_at, new Date(parsed.toDate)));
    }
    if (parsed.q) {
      const pattern = `%${parsed.q}%`;
      conditions.push(
        sql`(${hrAnnouncement.title} ILIKE ${pattern} OR ${hrAnnouncement.body} ILIKE ${pattern})`,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db
      .select()
      .from(hrAnnouncement)
      .where(whereClause)
      .orderBy(desc(hrAnnouncement.pinned), desc(hrAnnouncement.created_at));
  });
