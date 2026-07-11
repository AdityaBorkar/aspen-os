export type {
  AssignTaskInput,
  BulkUpdateTaskInput,
  CreateAttachmentInput,
  CreateAutomationRuleInput,
  CreateCommentInput,
  CreateLabelInput,
  CreateProjectInput,
  CreateProjectMemberInput,
  CreateReminderInput,
  CreateSavedViewInput,
  CreateStatusInput,
  CreateStatusTransitionInput,
  CreateTaskInput,
  CreateTaskLinkInput,
  CreateTaskTypeInput,
  CreateTimeEntryInput,
  CreateWatcherInput,
  ProjectFilters,
  ReminderFilters,
  TaskFilters,
  TimeEntryFilters,
  UpdateAutomationRuleInput,
  UpdateCommentInput,
  UpdateLabelInput,
  UpdateProjectInput,
  UpdateProjectMemberInput,
  UpdateReminderInput,
  UpdateSavedViewInput,
  UpdateStatusInput,
  UpdateTaskInput,
  UpdateTaskTypeInput,
  UpdateTimeEntryInput,
} from "./schemas";
export {
  AssignTaskSchema,
  BulkUpdateTaskSchema,
  CreateAttachmentSchema,
  CreateAutomationRuleSchema,
  CreateCommentSchema,
  CreateLabelSchema,
  CreateProjectMemberSchema,
  CreateProjectSchema,
  CreateReminderSchema,
  CreateSavedViewSchema,
  CreateStatusSchema,
  CreateStatusTransitionSchema,
  CreateTaskLinkSchema,
  CreateTaskSchema,
  CreateTaskTypeSchema,
  CreateTimeEntrySchema,
  CreateWatcherSchema,
  ProjectFiltersSchema,
  ReminderFiltersSchema,
  TimeEntryFiltersSchema,
  UpdateAutomationRuleSchema,
  UpdateCommentSchema,
  UpdateLabelSchema,
  UpdateProjectMemberSchema,
  UpdateProjectSchema,
  UpdateReminderSchema,
  UpdateSavedViewSchema,
  UpdateStatusSchema,
  UpdateTaskSchema,
  UpdateTaskTypeSchema,
  UpdateTimeEntrySchema,
} from "./schemas";

export interface TaskLinkInfo {
  linkType:
    | "blocks"
    | "blocked_by"
    | "related_to"
    | "duplicates"
    | "caused_by"
    | "split_from";
  sourceId: string;
  targetId: string;
}

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
