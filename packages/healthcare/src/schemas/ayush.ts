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

const CreateAyushCaseSheetSchema = object({
  branchId: BranchIdSchema,
  complaints: RequiredText("Complaints"),
  dosha: RequiredText("Dosha"),
  encounterId: RequiredText("Encounter"),
  history: optional(pipe(string(), maxLength(4000))),
  nadi: RequiredText("Nadi"),
  pathy: picklist(["ayurveda", "yoga", "unani", "siddha", "homeopathy"]),
  patientId: RequiredText("Patient"),
  prakriti: picklist([
    "vata",
    "pitta",
    "kapha",
    "vata-pitta",
    "pitta-kapha",
    "vata-kapha",
    "tridoshic",
  ]),
});

const UpdateAyushCaseSheetSchema = partial(CreateAyushCaseSheetSchema);

const CreateRepertorizationSchema = object({
  branchId: BranchIdSchema,
  caseId: RequiredText("Case sheet"),
  patientId: RequiredText("Patient"),
  potency: RequiredText("Potency"),
  remedy: RequiredText("Remedy"),
  rubrics: pipe(array(RequiredText("Rubric")), minLength(1, "Add at least one rubric")),
});

const UpdateRepertorizationSchema = partial(CreateRepertorizationSchema);

const CreateFollowUpSchema = object({
  branchId: BranchIdSchema,
  caseId: RequiredText("Case sheet"),
  improvement: picklist(["worse", "same", "better", "resolved"]),
  notes: RequiredText("Notes"),
  patientId: RequiredText("Patient"),
  visitNo: pipe(number(), minValue(1, "Visit number must be at least 1")),
});

const CreateAyushDiagnosisSchema = object({
  branchId: BranchIdSchema,
  caseId: RequiredText("Case sheet"),
  encounterId: RequiredText("Encounter"),
  label: optional(pipe(string(), maxLength(500))),
  namasteCode: RequiredText("NAMASTE code"),
  patientId: RequiredText("Patient"),
  tm2Code: RequiredText("TM2 code"),
});

const VitalsSchema = object({
  bpDys: pipe(number(), minValue(0)),
  bpSys: pipe(number(), minValue(0)),
  pulse: pipe(number(), minValue(0)),
});

const CreateTherapyPackageSchema = object({
  branchId: BranchIdSchema,
  caseId: optional(pipe(string(), minLength(1))),
  name: picklist(["panchakarma", "abhyanga", "shirodhara", "nasya", "basti", "other"]),
  patientId: RequiredText("Patient"),
  status: picklist(["Active", "Paused", "Expired", "Completed"]),
  totalSittings: pipe(number(), minValue(1, "Package needs at least 1 sitting")),
  validDays: optional(pipe(number(), minValue(1))),
});

const UpdateTherapyPackageSchema = partial(CreateTherapyPackageSchema);

const CreateTherapySittingSchema = object({
  branchId: BranchIdSchema,
  date: RequiredText("Date"),
  notes: optional(pipe(string(), maxLength(2000))),
  packageId: RequiredText("Therapy package"),
  patientId: RequiredText("Patient"),
  postVitals: VitalsSchema,
  preVitals: VitalsSchema,
  status: picklist(["Booked", "Attended", "Missed"]),
});

const UpdateTherapySittingSchema = partial(CreateTherapySittingSchema);

const PauseExtendPackageSchema = object({
  action: picklist(["pause", "resume", "extend", "complete"]),
  extendDays: optional(pipe(number(), minValue(1))),
  packageId: RequiredText("Therapy package"),
  reason: optional(pipe(string(), maxLength(1000))),
});

const CreateDietPlanSchema = object({
  branchId: BranchIdSchema,
  caseId: optional(pipe(string(), minLength(1))),
  chart: RequiredText("Diet chart"),
  patientId: RequiredText("Patient"),
  validFrom: RequiredText("Valid from"),
  validTo: RequiredText("Valid to"),
});

const UpdateDietPlanSchema = partial(CreateDietPlanSchema);

const CreateYogaBatchSchema = object({
  branchId: BranchIdSchema,
  capacity: pipe(number(), minValue(1, "Capacity must be at least 1")),
  name: RequiredText("Batch name"),
  schedule: RequiredText("Schedule"),
});

const UpdateYogaBatchSchema = partial(CreateYogaBatchSchema);

const CreateYogaEnrollmentSchema = object({
  batchId: RequiredText("Yoga batch"),
  branchId: BranchIdSchema,
  patientId: RequiredText("Patient"),
});

const AyushFiltersSchema = object({
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  patientId: optional(pipe(string(), minLength(1))),
});

export {
  AyushFiltersSchema,
  CreateAyushCaseSheetSchema,
  CreateAyushDiagnosisSchema,
  CreateDietPlanSchema,
  CreateFollowUpSchema,
  CreateRepertorizationSchema,
  CreateTherapyPackageSchema,
  CreateTherapySittingSchema,
  CreateYogaBatchSchema,
  CreateYogaEnrollmentSchema,
  PauseExtendPackageSchema,
  UpdateAyushCaseSheetSchema,
  UpdateDietPlanSchema,
  UpdateRepertorizationSchema,
  UpdateTherapyPackageSchema,
  UpdateTherapySittingSchema,
  UpdateYogaBatchSchema,
  VitalsSchema,
};

export type {
  AyushCaseSheetInput as CreateAyushCaseSheetInput,
  AyushDiagnosisInput as CreateAyushDiagnosisInput,
  AyushFiltersInput as AyushFilters,
  DietPlanInput as CreateDietPlanInput,
  FollowUpInput as CreateFollowUpInput,
  PauseExtendPackageInput,
  RepertorizationInput as CreateRepertorizationInput,
  TherapyPackageInput as CreateTherapyPackageInput,
  TherapySittingInput as CreateTherapySittingInput,
  UpdateAyushCaseSheetInput,
  UpdateDietPlanInput,
  UpdateRepertorizationInput,
  UpdateTherapyPackageInput,
  UpdateTherapySittingInput,
  UpdateYogaBatchInput,
  YogaBatchInput as CreateYogaBatchInput,
  YogaEnrollmentInput as CreateYogaEnrollmentInput,
};

type AyushCaseSheetInput = InferOutput<typeof CreateAyushCaseSheetSchema>;
type UpdateAyushCaseSheetInput = InferOutput<typeof UpdateAyushCaseSheetSchema>;
type RepertorizationInput = InferOutput<typeof CreateRepertorizationSchema>;
type UpdateRepertorizationInput = InferOutput<typeof UpdateRepertorizationSchema>;
type FollowUpInput = InferOutput<typeof CreateFollowUpSchema>;
type AyushDiagnosisInput = InferOutput<typeof CreateAyushDiagnosisSchema>;
type TherapyPackageInput = InferOutput<typeof CreateTherapyPackageSchema>;
type UpdateTherapyPackageInput = InferOutput<typeof UpdateTherapyPackageSchema>;
type TherapySittingInput = InferOutput<typeof CreateTherapySittingSchema>;
type UpdateTherapySittingInput = InferOutput<typeof UpdateTherapySittingSchema>;
type PauseExtendPackageInput = InferOutput<typeof PauseExtendPackageSchema>;
type DietPlanInput = InferOutput<typeof CreateDietPlanSchema>;
type UpdateDietPlanInput = InferOutput<typeof UpdateDietPlanSchema>;
type YogaBatchInput = InferOutput<typeof CreateYogaBatchSchema>;
type UpdateYogaBatchInput = InferOutput<typeof UpdateYogaBatchSchema>;
type YogaEnrollmentInput = InferOutput<typeof CreateYogaEnrollmentSchema>;
type AyushFiltersInput = InferOutput<typeof AyushFiltersSchema>;
