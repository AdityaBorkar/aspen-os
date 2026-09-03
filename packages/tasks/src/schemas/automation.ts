import { AutomationTriggerSchema } from "#/schemas/enums";
import { IdSchema, NameSchema } from "#/schemas/utils";

import { JsonValueSchema } from "@aspen-os/platform/server";
import { boolean, nullable, object, omit, optional, partial } from "valibot";
import type { InferOutput } from "valibot";

export const CreateAutomationRuleSchema = object({
  actions: JsonValueSchema,
  conditions: optional(nullable(JsonValueSchema)),
  isActive: optional(boolean()),
  name: NameSchema,
  projectId: IdSchema,
  trigger: AutomationTriggerSchema,
});

export type CreateAutomationRuleInput = InferOutput<typeof CreateAutomationRuleSchema>;

export const UpdateAutomationRuleSchema = partial(omit(CreateAutomationRuleSchema, ["projectId"]));

export type UpdateAutomationRuleInput = InferOutput<typeof UpdateAutomationRuleSchema>;
