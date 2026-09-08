import type { CreateTaskLinkInput } from "#/schemas";

export type {
  TaskAssignedEvent,
  TaskCommentedEvent,
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskDomainEventMap,
  TaskDueDateChangedEvent,
  TaskEventMap,
  TaskLinkedEvent,
  TaskStatusChangedEvent,
  TaskTimeLoggedEvent,
  TaskUnassignedEvent,
  TaskUnlinkedEvent,
  TaskUpdatedEvent,
} from "#/pubsub";
export { TASK_EVENTS } from "#/pubsub";
export type {
  AssignTaskInput,
  BulkUpdateTaskInput,
  CreateAttachmentInput,
  CreateAutomationRuleInput,
  CreateCommentInput,
  CreateLabelInput,
  CreateProjectInput,
  CreateProjectMemberInput,
  CreateStatusInput,
  CreateStatusTransitionInput,
  CreateTaskInput,
  CreateTaskLinkInput,
  CreateTaskTypeInput,
  CreateTimeEntryInput,
  CreateWatcherInput,
  ProjectFilters,
  TaskFilters,
  TimeEntryFilters,
  UpdateAutomationRuleInput,
  UpdateCommentInput,
  UpdateLabelInput,
  UpdateProjectInput,
  UpdateProjectMemberInput,
  UpdateStatusInput,
  UpdateTaskInput,
  UpdateTaskTypeInput,
  UpdateTimeEntryInput,
} from "#/schemas";
export {
  AssignTaskSchema,
  BulkUpdateTaskSchema,
  CreateAttachmentSchema,
  CreateAutomationRuleSchema,
  CreateCommentSchema,
  CreateLabelSchema,
  CreateProjectMemberSchema,
  CreateProjectSchema,
  CreateStatusSchema,
  CreateStatusTransitionSchema,
  CreateTaskLinkSchema,
  CreateTaskSchema,
  CreateTaskTypeSchema,
  CreateTimeEntrySchema,
  CreateWatcherSchema,
  IdSchema,
  IntSchema,
  ProjectFiltersSchema,
  TaskFiltersSchema,
  TimeEntryFiltersSchema,
  UpdateAutomationRuleSchema,
  UpdateCommentSchema,
  UpdateLabelSchema,
  UpdateProjectMemberSchema,
  UpdateProjectSchema,
  UpdateStatusSchema,
  UpdateTaskSchema,
  UpdateTaskTypeSchema,
  UpdateTimeEntrySchema,
} from "#/schemas";

export type TaskLinkInfo = CreateTaskLinkInput;

export interface TaskDependencyNode {
  dependsOn: string[];
  id: string;
  title: string;
}

export interface CriticalPathResult {
  duration: number;
  path: string[];
}

export interface TaskCompletionSummary {
  completedCount: number;
  completionPercentage: number;
  totalCount: number;
}
