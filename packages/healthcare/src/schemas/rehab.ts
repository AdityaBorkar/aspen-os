import { BranchIdSchema } from "#/schemas/utils";

import {
  array,
  integer,
  maxLength,
  maxValue,
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
  discipline: picklist(["occupational", "physio", "speech"]),
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
  items: optional(
    array(
      object({
        label: RequiredText("Item"),
        score: pipe(number("Item score must be a number"), minValue(0)),
      }),
    ),
  ),
  maxScore: optional(pipe(number(), minValue(0))),
  mmtGrade: optional(pipe(string(), minLength(1))),
  patientId: RequiredText("Patient"),
  romDegrees: optional(pipe(number(), minValue(0), maxValue(360))),
  romType: optional(picklist(["active", "passive"])),
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
        linkedScale: optional(RehabAssessmentToolSchema),
        measure: optional(pipe(string(), maxLength(500))),
        status: picklist(["open", "met", "abandoned"]),
        targetDate: optional(pipe(string(), minLength(1))),
        term: optional(picklist(["LT", "ST"])),
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
  modalities: optional(array(pipe(string(), minLength(1)))),
  patientId: RequiredText("Patient"),
  price: optional(pipe(number(), minValue(0))),
  totalSessions: pipe(number(), minValue(1, "Package needs at least 1 session")),
  validityDays: optional(pipe(number(), minValue(1))),
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
  equipmentId: optional(pipe(string(), minLength(1))),
  packageId: optional(pipe(string(), minLength(1))),
  patientId: RequiredText("Patient"),
  slot: optional(pipe(string(), minLength(1))),
  therapistId: optional(pipe(string(), minLength(1))),
});

const RehabConsumableSchema = object({
  item: RequiredText("Consumable"),
  qty: pipe(number(), minValue(1)),
});

const RecordRehabSittingSchema = object({
  consumables: optional(array(RehabConsumableSchema)),
  dosage: optional(pipe(string(), maxLength(500))),
  durationMins: optional(pipe(number(), minValue(1))),
  equipmentId: optional(pipe(string(), minLength(1))),
  exercises: optional(
    array(
      object({
        name: RequiredText("Exercise"),
        reps: optional(pipe(number(), minValue(0))),
        sets: optional(pipe(number(), minValue(0))),
      }),
    ),
  ),
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
  therapistId: optional(pipe(string(), minLength(1))),
});

const CreateExercisePrescriptionSchema = object({
  branchId: BranchIdSchema,
  episodeId: RequiredText("Episode"),
  exercises: pipe(
    array(
      object({
        frequency: optional(pipe(string(), maxLength(200))),
        holdSecs: optional(pipe(number(), minValue(0))),
        mediaUrl: optional(pipe(string(), maxLength(2000))),
        name: RequiredText("Exercise"),
        notes: optional(pipe(string(), maxLength(500))),
        precautions: optional(pipe(string(), maxLength(1000))),
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
  homePlan: optional(pipe(string(), maxLength(4000))),
  outcome: picklist(["recovered", "improved", "same", "referred", "dropped"]),
  patientId: RequiredText("Patient"),
  summary: RequiredText("Summary"),
});

const ProgressChartSchema = object({
  branchId: BranchIdSchema,
  episodeId: RequiredText("Episode"),
  tool: optional(RehabAssessmentToolSchema),
});

const ShareExerciseSheetSchema = object({
  branchId: BranchIdSchema,
  channel: picklist(["print", "whatsapp"]),
  sheetId: RequiredText("Sheet"),
  to: optional(pipe(string(), maxLength(50))),
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
  ProgressChartSchema,
  RecordRehabSittingSchema,
  RehabAssessmentToolSchema,
  RehabConsumableSchema,
  RehabFiltersSchema,
  RehabSittingStatusSchema,
  ShareExerciseSheetSchema,
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
  ShareExerciseSheetInput,
  ProgressChartInput as ProgressChartFilters,
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
type ProgressChartInput = InferOutput<typeof ProgressChartSchema>;
type ShareExerciseSheetInput = InferOutput<typeof ShareExerciseSheetSchema>;
