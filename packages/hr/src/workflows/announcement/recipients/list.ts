import { hrAnnouncementRecipient } from "#/db-schemas";
import { RecipientListFiltersSchema } from "#/types";
import { fetchAnnouncementById } from "#/utils/announcement-utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { minLength, object, optional, parse, pipe, string } from "valibot";

const InputSchema = object({
  announcementId: pipe(string(), minLength(1, "announcementId is required")),
  filters: optional(RecipientListFiltersSchema),
});

export const listRecipients = Workflow.name("hr.announcement.recipients.list")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { announcementId, filters } = input;

    await fetchAnnouncementById(ctx.db, announcementId);

    const parsed = parse(RecipientListFiltersSchema, filters ?? {});
    const conditions = [eq(hrAnnouncementRecipient.announcementId, announcementId)];

    if (parsed.deliveredOnly) {
      conditions.push(isNotNull(hrAnnouncementRecipient.userId));
    }

    return ctx.db
      .select()
      .from(hrAnnouncementRecipient)
      .where(and(...conditions))
      .orderBy(desc(hrAnnouncementRecipient.createdAt))
      .limit(parsed.limit)
      .offset(parsed.offset);
  });
