import { masterConnection } from "#/db-schemas";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchConnectionStep } from "#/workflow-steps/fetch-connection";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const testConnection = Workflow.name("masters.connection.test")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchConnectionStep, { id: input.id });

    const { baseUrl } = current;
    if (!baseUrl) {
      throw new Error(`Connection with id "${input.id}" has no base URL.`);
    }

    const result = await ctx.step.run("test-endpoint", async () => {
      try {
        const url = new URL(baseUrl);
        const response = await fetch(url, {
          method: "GET",
          signal: AbortSignal.timeout(10_000),
        });
        return {
          ok: response.ok,
          status: response.status,
          testedAt: new Date().toISOString(),
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
          ok: false,
          status: null,
          testedAt: new Date().toISOString(),
        };
      }
    });

    await ctx.db
      .update(masterConnection)
      .set({
        lastTestedAt: new Date(),
        lastUsedAt: result.ok ? new Date() : current.lastUsedAt,
        updatedAt: new Date(),
      })
      .where(eq(masterConnection.id, input.id));

    await ctx.audit.write({
      action: AUDIT_ACTION.TESTED,
      entityId: current.id,
      entityType: AUDIT_ENTITY_TYPE.CONNECTION,
      metadata: { ok: result.ok },
    });

    return result;
  });
