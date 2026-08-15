import { JsonValueSchema } from "#/schemas/json";
import { setSetting } from "#/services/settings-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

const SetSettingSchema = object({ key: string(), value: JsonValueSchema });

export const setSettingWorkflow = Workflow.name("dms.settings.set")
  .input(SetSettingSchema)
  .handler(async ({ key, value }, ctx) => {
    await setSetting(ctx.db, key, value);

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: key,
      entityType: AUDIT_ENTITY_TYPE.SETTING,
      newState: { key, value },
    });

    return { key };
  });
