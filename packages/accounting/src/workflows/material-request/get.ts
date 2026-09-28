import { accountingMaterialRequest, accountingMaterialRequestItem } from "#/db-schemas/purchase";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getMaterialRequest = Workflow.name("accounting.material-request.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [request] = await ctx.db
      .select()
      .from(accountingMaterialRequest)
      .where(eq(accountingMaterialRequest.id, id))
      .limit(1);
    if (!request) {
      throw new Error(`Material request "${id}" not found.`);
    }
    const items = await ctx.db
      .select()
      .from(accountingMaterialRequestItem)
      .where(eq(accountingMaterialRequestItem.material_request_id, id));
    return { items, request };
  });
