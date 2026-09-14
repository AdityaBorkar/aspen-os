import { BranchIdSchema } from "#/schemas/utils";

import {
  array,
  boolean,
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
  regex,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

const RequiredText = (label: string) => pipe(string(), minLength(1, `${label} is required`));

const NonNegative = (label: string) =>
  pipe(number(`${label} must be a number`), minValue(0, `${label} cannot be negative`));

const Percent = (label: string) =>
  pipe(
    number(`${label} must be a number`),
    minValue(0, `${label} cannot be negative`),
    maxValue(100, `${label} cannot exceed 100`),
  );

/** FDI notation: 11-18, 21-28, 31-38, 41-48 permanent + 51-55, 61-65, 71-75, 81-85 deciduous. */
const FdiToothSchema = pipe(
  string(),
  regex(
    /^(1[1-8]|2[1-8]|3[1-8]|4[1-8]|5[1-5]|6[1-5]|7[1-5]|8[1-5])$/,
    "Must be a valid FDI tooth number",
  ),
);

const ToothConditionSchema = picklist([
  "healthy",
  "caries",
  "fracture",
  "missing",
  "filling",
  "crown",
  "implant",
  "root-canal",
  "perio",
  "abscess",
  "other",
]);

const ToothSurfaceSchema = picklist([
  "mesial",
  "distal",
  "buccal",
  "lingual",
  "occlusal",
  "incisal",
]);

const CreateDentalChartSchema = object({
  branchId: BranchIdSchema,
  encounterId: RequiredText("Encounter"),
  entries: pipe(
    array(
      object({
        condition: ToothConditionSchema,
        notes: optional(pipe(string(), maxLength(500))),
        surface: optional(ToothSurfaceSchema),
        tooth: FdiToothSchema,
      }),
    ),
    minLength(1, "Chart at least one tooth"),
  ),
  patientId: RequiredText("Patient"),
});

const UpdateDentalChartSchema = partial(CreateDentalChartSchema);

const PlanStageSchema = picklist(["Planned", "Scheduled", "InChair", "Done"]);

const CreateTreatmentPlanSchema = object({
  branchId: BranchIdSchema,
  encounterId: RequiredText("Encounter"),
  patientId: RequiredText("Patient"),
  stages: pipe(
    array(
      object({
        price: NonNegative("Price"),
        procedure: RequiredText("Procedure"),
        stage: PlanStageSchema,
        tooth: optional(FdiToothSchema),
      }),
    ),
    minLength(1, "Plan at least one stage"),
  ),
  status: picklist(["Draft", "Approved", "InProgress", "Completed"]),
});

const UpdateTreatmentPlanSchema = partial(CreateTreatmentPlanSchema);

const CreateQuoteSchema = object({
  branchId: BranchIdSchema,
  discountPct: optional(Percent("Discount")),
  gstPct: optional(Percent("GST")),
  patientId: RequiredText("Patient"),
  planId: RequiredText("Treatment plan"),
  validDays: optional(pipe(number(), minValue(1, "Quote validity must be at least 1 day"))),
  validTill: optional(pipe(string(), minLength(1))),
});

const UpdateQuoteSchema = partial(CreateQuoteSchema);

const CreateDentalConsentSchema = object({
  branchId: BranchIdSchema,
  encounterId: RequiredText("Encounter"),
  patientId: RequiredText("Patient"),
  procedureName: RequiredText("Procedure"),
  signedAt: optional(pipe(string(), minLength(1))),
  status: picklist(["Pending", "Signed"]),
});

const UpdateDentalConsentSchema = partial(CreateDentalConsentSchema);

const CreateChairSlotSchema = object({
  branchId: BranchIdSchema,
  bufferMin: optional(pipe(number(), minValue(0, "Buffer cannot be negative"))),
  chairId: RequiredText("Chair"),
  date: RequiredText("Date"),
  durationMin: optional(pipe(number(), minValue(1, "Duration must be at least 1 minute"))),
  encounterId: RequiredText("Encounter"),
  patientId: RequiredText("Patient"),
  slot: RequiredText("Slot"),
});

const UpdateChairSlotSchema = partial(CreateChairSlotSchema);

const CreateLabJobSchema = object({
  branchId: BranchIdSchema,
  dueDate: optional(pipe(string(), minLength(1))),
  encounterId: optional(pipe(string(), minLength(1))),
  kind: picklist(["crown", "bridge", "denture", "implant", "aligner", "other"]),
  labName: RequiredText("Lab"),
  metal: optional(pipe(string(), maxLength(200))),
  patientId: RequiredText("Patient"),
  planId: optional(pipe(string(), minLength(1))),
  qcNote: optional(pipe(string(), maxLength(1000))),
  shade: optional(pipe(string(), maxLength(100))),
  status: picklist(["Raised", "InLab", "Trial", "Delivered", "Remake"]),
  tooth: optional(FdiToothSchema),
});

const UpdateLabJobSchema = partial(CreateLabJobSchema);

const TrackLabJobSchema = object({
  labJobId: RequiredText("Lab job"),
  note: optional(pipe(string(), maxLength(1000))),
  status: picklist(["Raised", "InLab", "Trial", "Delivered", "Remake"]),
});

const ClosePlanStageSchema = object({
  completed: optional(boolean()),
  nextAppointment: optional(pipe(string(), minLength(1))),
  note: optional(pipe(string(), maxLength(2000))),
  planId: RequiredText("Treatment plan"),
  stageIndex: pipe(
    number("Stage index must be a number"),
    minValue(0, "Stage index cannot be negative"),
  ),
  to: PlanStageSchema,
});

const RescheduleStageSchema = object({
  newDate: RequiredText("New date"),
  newSlot: optional(pipe(string(), minLength(1))),
  planId: RequiredText("Treatment plan"),
  reason: optional(pipe(string(), maxLength(1000))),
  stageIndex: pipe(
    number("Stage index must be a number"),
    minValue(0, "Stage index cannot be negative"),
  ),
});

const ImplantMilestoneSchema = object({
  healingNote: optional(pipe(string(), maxLength(2000))),
  milestone: picklist(["placement", "healing", "loading"]),
  planId: RequiredText("Treatment plan"),
  stageIndex: pipe(
    number("Stage index must be a number"),
    minValue(0, "Stage index cannot be negative"),
  ),
});

const DentalPackageSchema = object({
  branchId: BranchIdSchema,
  name: RequiredText("Package name"),
  patientId: RequiredText("Patient"),
  planId: RequiredText("Treatment plan"),
  price: NonNegative("Price"),
});

const PendingJobsFiltersSchema = object({
  branchId: BranchIdSchema,
  patientId: optional(pipe(string(), minLength(1))),
  planId: optional(pipe(string(), minLength(1))),
  status: optional(picklist(["Raised", "InLab", "Trial", "Delivered", "Remake"])),
});

const DentalFiltersSchema = object({
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  patientId: optional(pipe(string(), minLength(1))),
  planId: optional(pipe(string(), minLength(1))),
});

export {
  ClosePlanStageSchema,
  DentalPackageSchema,
  ImplantMilestoneSchema,
  CreateChairSlotSchema,
  CreateDentalChartSchema,
  CreateDentalConsentSchema,
  CreateLabJobSchema,
  CreateQuoteSchema,
  CreateTreatmentPlanSchema,
  DentalFiltersSchema,
  FdiToothSchema,
  PendingJobsFiltersSchema,
  PlanStageSchema,
  RescheduleStageSchema,
  ToothSurfaceSchema,
  ToothConditionSchema,
  TrackLabJobSchema,
  UpdateChairSlotSchema,
  UpdateDentalChartSchema,
  UpdateDentalConsentSchema,
  UpdateLabJobSchema,
  UpdateQuoteSchema,
  UpdateTreatmentPlanSchema,
};

export type {
  ChairSlotInput as CreateChairSlotInput,
  ClosePlanStageInput,
  DentalChartInput as CreateDentalChartInput,
  DentalConsentInput as CreateDentalConsentInput,
  DentalFiltersInput as DentalFilters,
  DentalPackageInput as CreateDentalPackageInput,
  ImplantMilestoneInput,
  PendingJobsFiltersInput as PendingJobsFilters,
  LabJobInput as CreateLabJobInput,
  QuoteInput as CreateQuoteInput,
  RescheduleStageInput,
  TrackLabJobInput,
  TreatmentPlanInput as CreateTreatmentPlanInput,
  UpdateChairSlotInput,
  UpdateDentalChartInput,
  UpdateDentalConsentInput,
  UpdateLabJobInput,
  UpdateQuoteInput,
  UpdateTreatmentPlanInput,
};

type DentalChartInput = InferOutput<typeof CreateDentalChartSchema>;
type UpdateDentalChartInput = InferOutput<typeof UpdateDentalChartSchema>;
type TreatmentPlanInput = InferOutput<typeof CreateTreatmentPlanSchema>;
type UpdateTreatmentPlanInput = InferOutput<typeof UpdateTreatmentPlanSchema>;
type QuoteInput = InferOutput<typeof CreateQuoteSchema>;
type UpdateQuoteInput = InferOutput<typeof UpdateQuoteSchema>;
type DentalConsentInput = InferOutput<typeof CreateDentalConsentSchema>;
type UpdateDentalConsentInput = InferOutput<typeof UpdateDentalConsentSchema>;
type ChairSlotInput = InferOutput<typeof CreateChairSlotSchema>;
type UpdateChairSlotInput = InferOutput<typeof UpdateChairSlotSchema>;
type LabJobInput = InferOutput<typeof CreateLabJobSchema>;
type UpdateLabJobInput = InferOutput<typeof UpdateLabJobSchema>;
type TrackLabJobInput = InferOutput<typeof TrackLabJobSchema>;
type ClosePlanStageInput = InferOutput<typeof ClosePlanStageSchema>;
type RescheduleStageInput = InferOutput<typeof RescheduleStageSchema>;
type ImplantMilestoneInput = InferOutput<typeof ImplantMilestoneSchema>;
type DentalPackageInput = InferOutput<typeof DentalPackageSchema>;
type PendingJobsFiltersInput = InferOutput<typeof PendingJobsFiltersSchema>;
type DentalFiltersInput = InferOutput<typeof DentalFiltersSchema>;
