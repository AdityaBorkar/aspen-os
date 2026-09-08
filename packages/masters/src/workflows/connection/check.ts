import { masterConnection } from "#/db-schemas";
import { testEndpoint } from "#/services/connection-service";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchConnectionStep } from "#/workflow-steps/fetch-connection";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const checkConnection = Workflow.name("masters.connection.check")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchConnectionStep, { id: input.id });

    const { base_url } = current;
    if (!base_url) {
      throw new Error(`Connection with id "${input.id}" has no base URL.`);
    }

    const result = await ctx.step.run("test-endpoint", () => testEndpoint(base_url));

    await ctx.step.run("record-test", () =>
      ctx.db
        .update(masterConnection)
        .set({
          last_tested_at: new Date(),
          last_used_at: result.ok ? new Date() : current.last_used_at,
          updated_at: new Date(),
        })
        .where(eq(masterConnection.id, input.id)),
    );

    await ctx.step.run("audit", () =>
      ctx.audit.write({
        action: AUDIT_ACTION.TESTED,
        entityId: current.id,
        entityType: AUDIT_ENTITY_TYPE.CONNECTION,
        metadata: { ok: result.ok },
      }),
    );

    return result;
  });
