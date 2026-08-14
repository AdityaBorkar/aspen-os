import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { dmsFileView } from "../db-schemas";
import { FILE_VIEW_EVENTS } from "../pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchFileViewStep } from "../workflow-steps/fetch-file-view";

const DeleteInputSchema = object({ id: string() });

export const deleteFileView = Workflow.name("dms.file-view.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run(fetchFileViewStep, { id });

    await ctx.db.delete(dmsFileView).where(eq(dmsFileView.id, id));

    await ctx.audit.write({
      action: AUDIT_ACTION.DELETED,
      crudAction: "delete",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.FILE_VIEW,
    });

    await ctx.pubsub.publish(FILE_VIEW_EVENTS.DELETED, { fileViewId: id });
  });
