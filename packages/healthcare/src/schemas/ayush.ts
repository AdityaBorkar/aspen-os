import { BranchIdSchema } from "#/schemas/utils";

import {
  array,
  boolean,
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

const requiredText = (label: string) => pipe(string(), minLength(1, `${label} is required`));

const CreateAyushCaseSheetSchema = object({
  agni: optional(pipe(string(), maxLength(500))),
  branchId: BranchIdSchema,
  complaints: requiredText("Complaints"),
  dosha: requiredText("Dosha"),
  encounterId: requiredText("Encounter"),
  history: optional(pipe(string(), maxLength(4000))),
  koshtha: optional(picklist(["mrudu", "madhya", "krura"])),
  mala: optional(pipe(string(), maxLength(500))),
  nadi: requiredText("Nadi"),
  pathy: picklist(["ayurveda", "yoga", "unani", "siddha", "homeopathy"]),
  patientId: requiredText("Patient"),
  planLines: optional(
    array(
      object({
        arm: picklist(["shodhana", "shamana"]),
        detail: pipe(string(), minLength(1), maxLength(1000)),
      }),
    ),
  ),
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
  caseId: requiredText("Case sheet"),
  dose: optional(pipe(string(), maxLength(500))),
  miasm: optional(picklist(["psora", "sycosis", "syphilis", "tubercular", "mixed"])),
  patientId: requiredText("Patient"),
  potency: requiredText("Potency"),
  remedy: requiredText("Remedy"),
  rubrics: pipe(array(requiredText("Rubric")), minLength(1, "Add at least one rubric")),
});

const UpdateRepertorizationSchema = partial(CreateRepertorizationSchema);

const CreateFollowUpSchema = object({
  branchId: BranchIdSchema,
  caseId: requiredText("Case sheet"),
  improvement: picklist(["worse", "same", "better", "resolved"]),
  notes: requiredText("Notes"),
  patientId: requiredText("Patient"),
  visitNo: pipe(number(), minValue(1, "Visit number must be at least 1")),
});

const CreateAyushDiagnosisSchema = object({
  branchId: BranchIdSchema,
  caseId: requiredText("Case sheet"),
  encounterId: requiredText("Encounter"),
  label: optional(pipe(string(), maxLength(500))),
  namasteCode: requiredText("NAMASTE code"),
  patientId: requiredText("Patient"),
  tm2Code: requiredText("TM2 code"),
});

const VitalsSchema = object({
  bpDys: pipe(number(), minValue(0)),
  bpSys: pipe(number(), minValue(0)),
  pulse: pipe(number(), minValue(0)),
});

const BookNadiSchema = object({
  branchId: BranchIdSchema,
  caseId: optional(pipe(string(), minLength(1))),
  date: requiredText("Date"),
  encounterId: optional(pipe(string(), minLength(1))),
  facilityId: requiredText("Facility"),
  findings: optional(pipe(string(), maxLength(2000))),
  patientId: requiredText("Patient"),
  serviceId: requiredText("Service"),
  slot: requiredText("Slot"),
});

const CreateTherapyPackageSchema = object({
  branchId: BranchIdSchema,
  caseId: optional(pipe(string(), minLength(1))),
  name: picklist(["panchakarma", "abhyanga", "shirodhara", "nasya", "basti", "other"]),
  outcomeNote: optional(pipe(string(), maxLength(2000))),
  patientId: requiredText("Patient"),
  procedures: optional(array(pipe(string(), minLength(1), maxLength(200)))),
  status: picklist(["Active", "Paused", "Expired", "Completed"]),
  totalSittings: pipe(number(), minValue(1, "Package needs at least 1 sitting")),
  validDays: optional(pipe(number(), minValue(1))),
});

const UpdateTherapyPackageSchema = partial(CreateTherapyPackageSchema);

const ChargeLineSchema = object({
  amount: pipe(number(), minValue(0, "Charge cannot be negative")),
  label: requiredText("Charge label"),
});

const ConsumableLineSchema = object({
  item: requiredText("Consumable"),
  qty: pipe(number(), minValue(0, "Quantity cannot be negative")),
});

const CreateTherapySittingSchema = object({
  branchId: BranchIdSchema,
  chargeLines: optional(array(ChargeLineSchema)),
  consumables: optional(array(ConsumableLineSchema)),
  date: requiredText("Date"),
  equipmentId: optional(pipe(string(), minLength(1))),
  notes: optional(pipe(string(), maxLength(2000))),
  packageId: requiredText("Therapy package"),
  patientId: requiredText("Patient"),
  postVitals: VitalsSchema,
  preVitals: VitalsSchema,
  roomId: optional(pipe(string(), minLength(1))),
  status: picklist(["Booked", "Attended", "Missed"]),
  therapistId: optional(pipe(string(), minLength(1))),
});

const UpdateTherapySittingSchema = partial(CreateTherapySittingSchema);

const PauseExtendPackageSchema = object({
  action: picklist(["pause", "resume", "extend", "complete"]),
  extendDays: optional(pipe(number(), minValue(1))),
  outcomeNote: optional(pipe(string(), maxLength(2000))),
  packageId: requiredText("Therapy package"),
  reason: optional(pipe(string(), maxLength(1000))),
});

const CreateDietPlanSchema = object({
  branchId: BranchIdSchema,
  caseId: optional(pipe(string(), minLength(1))),
  chart: requiredText("Diet chart"),
  language: optional(pipe(string(), minLength(1))),
  pathyVariant: optional(picklist(["ayurveda", "homeopathy", "allopathy", "dental"])),
  patientId: requiredText("Patient"),
  validFrom: requiredText("Valid from"),
  validTo: requiredText("Valid to"),
});

const UpdateDietPlanSchema = partial(CreateDietPlanSchema);

const CreateYogaBatchSchema = object({
  branchId: BranchIdSchema,
  capacity: pipe(number(), minValue(1, "Capacity must be at least 1")),
  name: requiredText("Batch name"),
  schedule: requiredText("Schedule"),
});

const UpdateYogaBatchSchema = partial(CreateYogaBatchSchema);

const CreateYogaEnrollmentSchema = object({
  batchId: requiredText("Yoga batch"),
  branchId: BranchIdSchema,
  patientId: requiredText("Patient"),
});

const YogaAttendanceSchema = object({
  attended: boolean(),
  batchId: requiredText("Yoga batch"),
  branchId: BranchIdSchema,
  date: requiredText("Date"),
  patientId: requiredText("Patient"),
});

const AyushPrescriptionSchema = object({
  anupana: optional(pipe(string(), maxLength(500))),
  branchId: BranchIdSchema,
  caseId: optional(pipe(string(), minLength(1))),
  encounterId: requiredText("Encounter"),
  items: pipe(
    array(
      object({
        dose: requiredText("Dose"),
        drug: requiredText("Drug"),
        kind: picklist(["classical", "proprietary"]),
      }),
    ),
    minLength(1, "Add at least one medicine"),
  ),
  patientId: requiredText("Patient"),
});

const FollowUpGridSaveSchema = object({
  branchId: BranchIdSchema,
  caseId: requiredText("Case sheet"),
  improvement: picklist(["worse", "same", "better", "resolved"]),
  notes: requiredText("Notes"),
  patientId: requiredText("Patient"),
  visitNo: pipe(number(), minValue(1, "Visit number must be at least 1")),
});

const FollowUpGridListSchema = object({
  branchId: BranchIdSchema,
  caseId: requiredText("Case sheet"),
});

const PackageOutcomeSchema = object({
  branchId: BranchIdSchema,
  outcomeNote: requiredText("Outcome note"),
  packageId: requiredText("Therapy package"),
});

const AyushFiltersSchema = object({
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  patientId: optional(pipe(string(), minLength(1))),
});

export {
  AyushFiltersSchema,
  AyushPrescriptionSchema,
  BookNadiSchema,
  CreateAyushCaseSheetSchema,
  CreateAyushDiagnosisSchema,
  CreateDietPlanSchema,
  CreateFollowUpSchema,
  CreateRepertorizationSchema,
  CreateTherapyPackageSchema,
  CreateTherapySittingSchema,
  FollowUpGridListSchema,
  FollowUpGridSaveSchema,
  CreateYogaBatchSchema,
  CreateYogaEnrollmentSchema,
  PackageOutcomeSchema,
  PauseExtendPackageSchema,
  YogaAttendanceSchema,
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
  AyushPrescriptionInput as CreateAyushPrescriptionInput,
  BookNadiInput,
  AyushDiagnosisInput as CreateAyushDiagnosisInput,
  AyushFiltersInput as AyushFilters,
  DietPlanInput as CreateDietPlanInput,
  FollowUpInput as CreateFollowUpInput,
  PauseExtendPackageInput,
  FollowUpGridListInput,
  FollowUpGridSaveInput,
  PackageOutcomeInput,
  RepertorizationInput as CreateRepertorizationInput,
  TherapyPackageInput as CreateTherapyPackageInput,
  TherapySittingInput as CreateTherapySittingInput,
  UpdateAyushCaseSheetInput,
  UpdateDietPlanInput,
  UpdateRepertorizationInput,
  UpdateTherapyPackageInput,
  UpdateTherapySittingInput,
  UpdateYogaBatchInput,
  YogaAttendanceInput,
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

type BookNadiInput = InferOutput<typeof BookNadiSchema>;
type AyushPrescriptionInput = InferOutput<typeof AyushPrescriptionSchema>;
type FollowUpGridSaveInput = InferOutput<typeof FollowUpGridSaveSchema>;
type FollowUpGridListInput = InferOutput<typeof FollowUpGridListSchema>;
type PackageOutcomeInput = InferOutput<typeof PackageOutcomeSchema>;
type YogaAttendanceInput = InferOutput<typeof YogaAttendanceSchema>;
