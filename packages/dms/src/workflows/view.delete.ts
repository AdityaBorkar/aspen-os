import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { dmsView } from "../db-schemas";
import { VIEW_EVENTS } from "../pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchViewStep } from "./steps/fetch-view";

const DeleteInputSchema = object({ id: string() });

export const deleteView = Workflow.name("dms.view.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run(fetchViewStep, { id });

    await ctx.db.delete(dmsView).where(eq(dmsView.id, id));

    await ctx.audit.write({
      action: AUDIT_ACTION.DELETED,
      crudAction: "delete",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.VIEW,
    });

    await ctx.pubsub.publish(VIEW_EVENTS.DELETED, { viewId: id });
  });
