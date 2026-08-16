import { workspaceDraft } from "#/db-schemas";
import { DraftFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ filters: DraftFiltersSchema });

export const listDrafts = Workflow.name("workspace.draft.list")
  .input(ListInputSchema)
  .handler(async ({ filters }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }
    const validated = parse(DraftFiltersSchema, filters);

    const conditions = [
      or(eq(workspaceDraft.access, "global"), eq(workspaceDraft.ownerId, ctx.actorId)),
    ];

    if (!validated.includeTrashed) {
      conditions.push(isNull(workspaceDraft.deletedAt));
    }
    if (validated.status) {
      conditions.push(eq(workspaceDraft.status, validated.status));
    }
    if (validated.targetDomain) {
      conditions.push(eq(workspaceDraft.targetDomain, validated.targetDomain));
    }
    if (validated.search) {
      conditions.push(
        sql`(${workspaceDraft.title} ilike ${`%${validated.search}%`} OR ${workspaceDraft.body} ilike ${`%${validated.search}%`})`,
      );
    }

    return ctx.db
      .select()
      .from(workspaceDraft)
      .where(and(...conditions))
      .orderBy(desc(workspaceDraft.updatedAt))
      .limit(validated.limit ?? 50)
      .offset(validated.offset ?? 0);
  });
