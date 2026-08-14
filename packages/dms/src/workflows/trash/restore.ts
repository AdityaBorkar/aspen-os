import { Workflow } from "@aspen-os/platform/server";
import { object, optional, picklist, string } from "valibot";

import { restoreFile } from "../file/restore";
import { restoreFolder } from "../folder/restore";

const RestoreSchema = object({
  entityType: picklist(["file", "folder"]),
  expiryDate: optional(string()),
  id: string(),
});

export const restoreFromTrash = Workflow.name("dms.trash.restore")
  .input(RestoreSchema)
  .handler(async ({ id, entityType, expiryDate }, ctx) => {
    const runOptions = {
      actorId: ctx.actorId,
      audit: ctx.audit,
      config: ctx.config,
      db: ctx.db,
      pubsub: ctx.pubsub,
    };

    if (entityType === "folder") {
      return restoreFolder.run({ id }, runOptions);
    }

    return restoreFile.run({ expiryDate, id }, runOptions);
  });
