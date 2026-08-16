import { SETTING_EVENTS } from "#/pubsub";
import { setSetting } from "#/services/settings-service";
import { SetSettingSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SetInputSchema = object({ input: SetSettingSchema });

export const setSettingWorkflow = Workflow.name("comms.settings.set")
  .input(SetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SetSettingSchema, input);
    await setSetting(ctx.db, parsed.key, parsed.value);

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: parsed.key,
        entityType: AUDIT_ENTITY_TYPE.SETTING,
        newState: { key: parsed.key, value: parsed.value },
      });

      await ctx.pubsub.publish(SETTING_EVENTS.UPDATED, {
        changes: { [parsed.key]: parsed.value },
      });
    });

    return { key: parsed.key };
  });
