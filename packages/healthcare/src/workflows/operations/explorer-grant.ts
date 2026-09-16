import { healthcareExplorerGrant } from "#/db-schemas/staff";
import { OPERATIONS_EVENTS } from "#/pubsub";
import { GrantExplorerSchema } from "#/schemas/operations";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ExplorerGrantInputSchema = object({ input: GrantExplorerSchema });

export const explorerGrant = Workflow.name("healthcare.operations.explorer-grant")
  .input(ExplorerGrantInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(GrantExplorerSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [row] = await ctx.step.run("insert-grant", async () =>
      ctx.db
        .insert(healthcareExplorerGrant)
        .values({
          branch_id: branchId,
          expires_at: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
          grantee_id: parsed.granteeId,
          scope: parsed.scope,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record explorer grant.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.OPERATIONS,
        newState: { granteeId: row.grantee_id, scope: row.scope },
      });
      // The explorer-grant table lives in db-schemas/staff.ts but is owned by
      // operations; the shared surface owns grants/views/CSV/report-definitions.
      // Workspace is the interim owner (reports is a placeholder); this row
      // carries the workspace grant intent.
      await ctx.pubsub.publish(OPERATIONS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        data: {
          granteeId: row.grantee_id,
          healthcareGrantId: row.id,
          scope: row.scope,
          workspaceOwner: "workspace.filter-view",
        },
        id: row.id,
      });
    });
    return { granteeId: row.grantee_id, id: row.id, scope: row.scope };
  });
