import { SETTING_EVENTS } from "#/pubsub";
import { SetSettingSchema } from "#/schemas/setting";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { auditAndPublish } from "#/workflow-steps/audit";
import { setSetting } from "#/workflow-steps/settings-service";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const SetInputSchema = object({ input: SetSettingSchema });

export const setSettingWorkflow = Workflow.name("comms.settings.set")
  .input(SetInputSchema)
  .handler(async ({ input }, ctx) => {
    await setSetting(ctx.db, input.key, input.value);

    await auditAndPublish(ctx, {
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: input.key,
      entityType: AUDIT_ENTITY_TYPE.SETTING,
      event: {
        payload: { changes: { [input.key]: input.value } },
        topic: SETTING_EVENTS.UPDATED,
      },
      newState: { key: input.key, value: input.value },
    });

    return { key: input.key };
  });
