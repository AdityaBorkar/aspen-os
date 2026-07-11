import {
  boolean,
  type InferOutput,
  minLength,
  nullable,
  object,
  optional,
  pipe,
  string,
} from "valibot";

import { AutomationTriggerSchema } from "./enums";
import { NameSchema } from "./utils";

export const CreateAutomationRuleSchema = object({
  actions: object({}),
  conditions: optional(nullable(object({}))),
  isActive: optional(boolean()),
  name: NameSchema,
  projectId: pipe(string(), minLength(1, "projectId is required")),
  trigger: AutomationTriggerSchema,
});

export type CreateAutomationRuleInput = InferOutput<
  typeof CreateAutomationRuleSchema
>;

export const UpdateAutomationRuleSchema = object({
  actions: optional(object({})),
  conditions: optional(nullable(object({}))),
  isActive: optional(boolean()),
  name: optional(NameSchema),
  trigger: optional(AutomationTriggerSchema),
});

export type UpdateAutomationRuleInput = InferOutput<
  typeof UpdateAutomationRuleSchema
>;
