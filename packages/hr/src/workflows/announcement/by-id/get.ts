import { hrAnnouncementRecipient } from "#/db-schemas";
import { fetchAnnouncementById } from "#/utils/announcement-utils";

import { Workflow } from "@aspen-os/platform/server";
import { count, eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getAnnouncementById = Workflow.name("hr.announcement.get-by-id")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const announcement = await fetchAnnouncementById(ctx.db, id);

    const [recipientCount] = await ctx.db
      .select({ count: count() })
      .from(hrAnnouncementRecipient)
      .where(eq(hrAnnouncementRecipient.announcementId, id));

    return {
      ...announcement,
      recipientCount: recipientCount?.count ?? 0,
    };
  });
