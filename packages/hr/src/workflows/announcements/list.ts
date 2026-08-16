import { hrAnnouncement } from "#/db-schemas";
import { AnnouncementFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { object, optional, parse } from "valibot";

const InputSchema = object({
  filters: optional(AnnouncementFiltersSchema),
});

export const listAnnouncements = Workflow.name("hr.announcements.list")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(AnnouncementFiltersSchema, filters) : {};
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
    if (parsed.isPinned !== undefined) {
      conditions.push(eq(hrAnnouncement.isPinned, parsed.isPinned));
    }
    if (parsed.fromDate) {
      conditions.push(gte(hrAnnouncement.createdAt, new Date(parsed.fromDate)));
    }
    if (parsed.toDate) {
      conditions.push(lte(hrAnnouncement.createdAt, new Date(parsed.toDate)));
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
      .orderBy(desc(hrAnnouncement.isPinned), desc(hrAnnouncement.createdAt));
  });
