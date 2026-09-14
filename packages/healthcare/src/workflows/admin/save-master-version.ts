import { healthcareMasterVersion } from "#/db-schemas/admin";
import { SaveMasterVersionSchema } from "#/schemas/admin";
import { AUDIT_ACTION } from "#/utils/constants";
import { toMasterVersionDto } from "#/workflow-steps/fetch-admin";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SaveMasterVersionInputSchema = object({ input: SaveMasterVersionSchema });

export const saveMasterVersion = Workflow.name("healthcare.admin.save-master-version")
  .input(SaveMasterVersionInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SaveMasterVersionSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [row] = await ctx.step.run("insert-master-version", async () =>
      ctx.db
        .insert(healthcareMasterVersion)
        .values({
          branch_id: branchId,
          domain: parsed.domain,
          id: crypto.randomUUID(),
          payload: parsed.payload ? { raw: parsed.payload } : {},
          version: parsed.version,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save master version.");
    }
    await ctx.step.run("audit-master-version", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: "healthcare:master",
        newState: { domain: row.domain, id: row.id, version: row.version },
      });
    });
    return toMasterVersionDto(row);
  });
