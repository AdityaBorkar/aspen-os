import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { hrPermission } from "../../../db-schemas";
import { CreateHrPermissionSchema } from "../../../types";

const InputSchema = object({
  input: CreateHrPermissionSchema,
});

export const createPermission = Workflow.name("hr.access.create-permission")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateHrPermissionSchema, input);

    const [result] = await ctx.db
      .insert(hrPermission)
      .values({
        action: parsed.action,
        description: parsed.description,
        module: parsed.module,
      })
      .returning();
    return result;
  });
