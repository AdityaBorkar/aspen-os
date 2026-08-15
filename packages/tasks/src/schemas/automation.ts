import { AutomationTriggerSchema } from "#/schemas/enums";
import { NameSchema } from "#/schemas/utils";

import { boolean, minLength, nullable, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateAutomationRuleSchema = object({
  actions: object({}),
  conditions: optional(nullable(object({}))),
  isActive: optional(boolean()),
  name: NameSchema,
  projectId: pipe(string(), minLength(1, "projectId is required")),
  trigger: AutomationTriggerSchema,
});

export type CreateAutomationRuleInput = InferOutput<typeof CreateAutomationRuleSchema>;

export const UpdateAutomationRuleSchema = object({
  actions: optional(object({})),
  conditions: optional(nullable(object({}))),
  isActive: optional(boolean()),
  name: optional(NameSchema),
  trigger: optional(AutomationTriggerSchema),
});

export type UpdateAutomationRuleInput = InferOutput<typeof UpdateAutomationRuleSchema>;
