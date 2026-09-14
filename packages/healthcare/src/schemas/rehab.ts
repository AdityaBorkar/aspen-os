import { BranchIdSchema } from "#/schemas/utils";

import {
  array,
  integer,
  maxLength,
  minLength,
  minValue,
  number,
  object,
  optional,
  partial,
  picklist,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

const RequiredText = (label: string) => pipe(string(), minLength(1, `${label} is required`));

const CreateRehabEpisodeSchema = object({
  branchId: BranchIdSchema,
  condition: RequiredText("Condition"),
  discipline: picklist(["physio", "speech"]),
  encounterId: optional(pipe(string(), minLength(1))),
  patientId: RequiredText("Patient"),
  status: picklist(["Active", "Discharged"]),
});

const UpdateRehabEpisodeSchema = partial(CreateRehabEpisodeSchema);

const RehabAssessmentToolSchema = picklist([
  "MMT",
  "ROM",
  "Berg",
  "Barthel",
  "FIM",
  "VAS",
  "gait",
  "GUSS",
  "FOIS",
]);

const CreateRehabAssessmentSchema = object({
  branchId: BranchIdSchema,
  details: optional(pipe(string(), maxLength(4000))),
  episodeId: RequiredText("Episode"),
  maxScore: optional(pipe(number(), minValue(0))),
  patientId: RequiredText("Patient"),
  score: pipe(number("Score must be a number")),
  status: picklist(["Draft", "Final"]),
  tool: RehabAssessmentToolSchema,
});

const CreateRehabGoalPlanSchema = object({
  branchId: BranchIdSchema,
  episodeId: RequiredText("Episode"),
  goals: pipe(
    array(
      object({
        goal: RequiredText("Goal"),
        status: picklist(["open", "met", "abandoned"]),
        targetDate: optional(pipe(string(), minLength(1))),
      }),
    ),
    minLength(1, "Set at least one goal"),
  ),
  patientId: RequiredText("Patient"),
});

const CreateRehabPackageSchema = object({
  branchId: BranchIdSchema,
  episodeId: RequiredText("Episode"),
  frequency: RequiredText("Frequency"),
  patientId: RequiredText("Patient"),
  totalSessions: pipe(number(), minValue(1, "Package needs at least 1 session")),
});

const RehabSittingStatusSchema = picklist([
  "Booked",
  "CheckedIn",
  "InProgress",
  "Completed",
  "Cancelled",
  "NoShow",
]);

const BookRehabSittingSchema = object({
  branchId: BranchIdSchema,
  date: RequiredText("Date"),
  episodeId: RequiredText("Episode"),
  packageId: optional(pipe(string(), minLength(1))),
  patientId: RequiredText("Patient"),
  slot: optional(pipe(string(), minLength(1))),
});

const RecordRehabSittingSchema = object({
  modality: optional(pipe(string(), minLength(1))),
  notes: optional(pipe(string(), maxLength(2000))),
  postVitals: object({
    bpDys: pipe(number(), minValue(0)),
    bpSys: pipe(number(), minValue(0)),
    pulse: pipe(number(), minValue(0)),
  }),
  preVitals: object({
    bpDys: pipe(number(), minValue(0)),
    bpSys: pipe(number(), minValue(0)),
    pulse: pipe(number(), minValue(0)),
  }),
  sittingId: RequiredText("Sitting"),
  status: RehabSittingStatusSchema,
});

const CreateExercisePrescriptionSchema = object({
  branchId: BranchIdSchema,
  episodeId: RequiredText("Episode"),
  exercises: pipe(
    array(
      object({
        holdSecs: optional(pipe(number(), minValue(0))),
        name: RequiredText("Exercise"),
        notes: optional(pipe(string(), maxLength(500))),
        reps: optional(pipe(number(), minValue(0))),
        sets: optional(pipe(number(), minValue(0))),
      }),
    ),
    minLength(1, "Prescribe at least one exercise"),
  ),
  patientId: RequiredText("Patient"),
});

const CreateOutcomeScoreSchema = object({
  branchId: BranchIdSchema,
  episodeId: RequiredText("Episode"),
  patientId: RequiredText("Patient"),
  score: pipe(number("Score must be a number")),
  tool: RehabAssessmentToolSchema,
});

const CreateDischargeSummarySchema = object({
  branchId: BranchIdSchema,
  episodeId: RequiredText("Episode"),
  outcome: picklist(["recovered", "improved", "same", "referred", "dropped"]),
  patientId: RequiredText("Patient"),
  summary: RequiredText("Summary"),
});

const RehabFiltersSchema = object({
  branchId: BranchIdSchema,
  episodeId: optional(pipe(string(), minLength(1))),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  patientId: optional(pipe(string(), minLength(1))),
});

export {
  BookRehabSittingSchema,
  CreateDischargeSummarySchema,
  CreateExercisePrescriptionSchema,
  CreateOutcomeScoreSchema,
  CreateRehabAssessmentSchema,
  CreateRehabEpisodeSchema,
  CreateRehabGoalPlanSchema,
  CreateRehabPackageSchema,
  RecordRehabSittingSchema,
  RehabAssessmentToolSchema,
  RehabFiltersSchema,
  RehabSittingStatusSchema,
  UpdateRehabEpisodeSchema,
};

export type {
  DischargeSummaryInput as CreateDischargeSummaryInput,
  ExercisePrescriptionInput as CreateExercisePrescriptionInput,
  OutcomeScoreInput as CreateOutcomeScoreInput,
  RehabAssessmentInput as CreateRehabAssessmentInput,
  RehabEpisodeInput as CreateRehabEpisodeInput,
  RehabFiltersInput as RehabFilters,
  RehabGoalPlanInput as CreateRehabGoalPlanInput,
  RehabPackageInput as CreateRehabPackageInput,
  RehabSittingBookInput as BookRehabSittingInput,
  RehabSittingRecordInput as RecordRehabSittingInput,
  UpdateRehabEpisodeInput,
};

type RehabEpisodeInput = InferOutput<typeof CreateRehabEpisodeSchema>;
type UpdateRehabEpisodeInput = InferOutput<typeof UpdateRehabEpisodeSchema>;
type RehabAssessmentInput = InferOutput<typeof CreateRehabAssessmentSchema>;
type RehabGoalPlanInput = InferOutput<typeof CreateRehabGoalPlanSchema>;
type RehabPackageInput = InferOutput<typeof CreateRehabPackageSchema>;
type RehabSittingBookInput = InferOutput<typeof BookRehabSittingSchema>;
type RehabSittingRecordInput = InferOutput<typeof RecordRehabSittingSchema>;
type ExercisePrescriptionInput = InferOutput<typeof CreateExercisePrescriptionSchema>;
type OutcomeScoreInput = InferOutput<typeof CreateOutcomeScoreSchema>;
type DischargeSummaryInput = InferOutput<typeof CreateDischargeSummarySchema>;
type RehabFiltersInput = InferOutput<typeof RehabFiltersSchema>;
