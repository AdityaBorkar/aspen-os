import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { dmsView } from "../db-schemas";
import { VIEW_EVENTS } from "../pubsub";
import { CreateViewSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { unsetDefaultView } from "./view.utils";

const CreateInputSchema = object({ input: CreateViewSchema });

export const createView = Workflow.name("dms.view.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateViewSchema, input);

    if (parsed.isDefault) {
      await unsetDefaultView(ctx.db, parsed.ownerId);
    }

    const [view] = await ctx.db
      .insert(dmsView)
      .values({
        filters: parsed.filters ?? [],
        isDefault: parsed.isDefault,
        isPinned: false,
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
        entityType: AUDIT_ENTITY_TYPE.VIEW,
        newState: { isShared: parsed.isShared, name: parsed.name },
      });

      await ctx.pubsub.publish(VIEW_EVENTS.CREATED, { viewId: view?.id ?? "" });
    });

    return view;
  });
