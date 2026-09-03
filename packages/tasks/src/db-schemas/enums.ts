import {
  AUTOMATION_TRIGGER,
  PROJECT_MEMBER_ROLE,
  PROJECT_STATUS,
  SAVED_VIEW_TYPE,
  STATUS_CATEGORY,
  TASK_LINK_TYPE,
  TASK_PRIORITY,
} from "#/utils/constants";

import { pgEnum } from "drizzle-orm/pg-core";

function enumValues<TValue extends string>(values: readonly TValue[]): [TValue, ...TValue[]] {
  const [first, ...rest] = values;
  if (first === undefined) {
    throw new Error("Enum must declare at least one value.");
  }
  return [first, ...rest];
}

export const taskPriorityEnum = pgEnum("task_priority", enumValues(Object.values(TASK_PRIORITY)));

export const taskLinkTypeEnum = pgEnum("task_link_type", enumValues(Object.values(TASK_LINK_TYPE)));

export const projectStatusEnum = pgEnum(
  "project_status",
  enumValues(Object.values(PROJECT_STATUS)),
);

export const projectMemberRoleEnum = pgEnum(
  "project_member_role",
  enumValues(Object.values(PROJECT_MEMBER_ROLE)),
);

export const statusCategoryEnum = pgEnum(
  "status_category",
  enumValues(Object.values(STATUS_CATEGORY)),
);

export const savedViewTypeEnum = pgEnum(
  "saved_view_type",
  enumValues(Object.values(SAVED_VIEW_TYPE)),
);

export const automationTriggerEnum = pgEnum(
  "automation_trigger",
  enumValues(Object.values(AUTOMATION_TRIGGER)),
);
