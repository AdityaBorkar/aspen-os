import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { dmsFileView } from "../db-schemas";
import { FILE_VIEW_EVENTS } from "../pubsub";
import { CreateFileViewSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { unsetDefaultFileView } from "./file-view.utils";

const CreateInputSchema = object({ input: CreateFileViewSchema });

export const createFileView = Workflow.name("dms.file-view.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateFileViewSchema, input);

    if (parsed.isDefault) {
      await unsetDefaultFileView(ctx.db, parsed.ownerId);
    }

    const [view] = await ctx.db
      .insert(dmsFileView)
      .values({
        filters: parsed.filters ?? [],
        isDefault: parsed.isDefault,
        isShared: parsed.isShared,
        name: parsed.name,
        ownerId: parsed.ownerId,
        sort: parsed.sort ?? [],
      })
      .returning();

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "create",
        entityId: view?.id ?? "",
        entityType: AUDIT_ENTITY_TYPE.FILE_VIEW,
        newState: { isShared: parsed.isShared, name: parsed.name },
      });

      await ctx.pubsub.publish(FILE_VIEW_EVENTS.CREATED, { fileViewId: view?.id ?? "" });
    });

    return view;
  });
