import { workspaceDashboard, workspaceDraft, workspaceView } from "#/db-schemas";
import { getWorkspaceConfig } from "#/runtime";
import { QuickSearchSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { object, parse } from "valibot";

const QuickInputSchema = object({ input: QuickSearchSchema });

export const quickSearch = Workflow.name("workspace.search.quick")
  .input(QuickInputSchema)
  .handler(async ({ input }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }
    const parsed = parse(QuickSearchSchema, input);
    const limit = parsed.limit ?? getWorkspaceConfig().quickSearchLimit;
    const term = `%${parsed.query}%`;

    const accessScope = or(
      eq(workspaceDraft.access, "global"),
      eq(workspaceDraft.ownerId, ctx.actorId),
    );

    const drafts = await ctx.db
      .select({
        access: workspaceDraft.access,
        id: workspaceDraft.id,
        status: workspaceDraft.status,
        title: workspaceDraft.title,
      })
      .from(workspaceDraft)
      .where(
        and(
          accessScope,
          isNull(workspaceDraft.deletedAt),
          sql`(${workspaceDraft.title} ilike ${term} OR ${workspaceDraft.body} ilike ${term})`,
        ),
      )
      .limit(limit);

    const views = await ctx.db
      .select({
        access: workspaceView.access,
        domain: workspaceView.domain,
        id: workspaceView.id,
        name: workspaceView.name,
      })
      .from(workspaceView)
      .where(
        and(
          or(eq(workspaceView.access, "global"), eq(workspaceView.ownerId, ctx.actorId)),
          sql`(${workspaceView.name} ilike ${term} OR ${workspaceView.domain} ilike ${term})`,
        ),
      )
      .limit(limit);

    const dashboards = await ctx.db
      .select({
        access: workspaceDashboard.access,
        id: workspaceDashboard.id,
        name: workspaceDashboard.name,
      })
      .from(workspaceDashboard)
      .where(
        and(
          or(eq(workspaceDashboard.access, "global"), eq(workspaceDashboard.ownerId, ctx.actorId)),
          sql`(${workspaceDashboard.name} ilike ${term} OR ${workspaceDashboard.description} ilike ${term})`,
        ),
      )
      .limit(limit);

    return { dashboards, drafts, views };
  });
