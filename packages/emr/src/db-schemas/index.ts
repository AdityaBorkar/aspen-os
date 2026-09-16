import type { SchemaMap } from "@aspen-os/platform/server";

export {
  healthcareSoapNote,
  healthcareExamFinding,
  healthcareChronicLog,
  healthcareImmunization,
  healthcareRegisterEntry,
  healthcareTriageEntry,
  healthcareProblem,
} from "#/db-schemas/allopathy";
export {
  healthcareDentalChart,
  healthcareTreatmentPlan,
  healthcarePlanStage,
  healthcareQuote,
  healthcareDentalConsent,
  healthcareChairSlot,
  healthcareLabJob,
} from "#/db-schemas/dental";
export {
  healthcareAyushCaseSheet,
  healthcareRepertorization,
  healthcareTherapyPackage,
  healthcareTherapySitting,
  healthcareDietPlan,
  healthcareYogaBatch,
  healthcareYogaEnrollment,
} from "#/db-schemas/ayush";
export {
  healthcareRehabEpisode,
  healthcareRehabAssessment,
  healthcareRehabGoal,
  healthcareRehabSitting,
  healthcareExerciseSheet,
  healthcareOutcomeScore,
  healthcareRehabDischarge,
} from "#/db-schemas/rehab";
export {
  healthcarePsychAssessment,
  healthcareScaleResult,
  healthcareRiskFlag,
  healthcareSafetyPlan,
  healthcareCounsellingSession,
  healthcareAddictionChart,
  healthcareRelapsePlan,
  healthcareControlledPrescription,
  healthcareSideEffectCheck,
  healthcareCaregiverConsent,
} from "#/db-schemas/psych";
export {
  healthcareEncounter,
  healthcareEncounterDiagnosis,
  healthcarePrescription,
  healthcareVitals,
  healthcareClinicOrder,
  healthcareFollowUp,
  healthcareEncounterAddendum,
} from "#/db-schemas/encounters";
export { healthcareObservation } from "#/db-schemas/observation";
export { healthcareCondition } from "#/db-schemas/condition";
export {
  healthcarePatient,
  healthcareFamilyLink,
  healthcareAllergy,
  healthcareConsent,
  healthcareFlag,
  healthcareMergeRequest,
  healthcareCommunication,
  healthcareRecall,
  healthcareShareSlip,
} from "#/db-schemas/patient";

import {
  healthcareSoapNote,
  healthcareExamFinding,
  healthcareChronicLog,
  healthcareImmunization,
  healthcareRegisterEntry,
  healthcareTriageEntry,
  healthcareProblem,
} from "#/db-schemas/allopathy";
import {
  healthcareAyushCaseSheet,
  healthcareRepertorization,
  healthcareTherapyPackage,
  healthcareTherapySitting,
  healthcareDietPlan,
  healthcareYogaBatch,
  healthcareYogaEnrollment,
} from "#/db-schemas/ayush";
import { healthcareCondition } from "#/db-schemas/condition";
import {
  healthcareDentalChart,
  healthcareTreatmentPlan,
  healthcarePlanStage,
  healthcareQuote,
  healthcareDentalConsent,
  healthcareChairSlot,
  healthcareLabJob,
} from "#/db-schemas/dental";
import {
  healthcareEncounter,
  healthcareEncounterDiagnosis,
  healthcarePrescription,
  healthcareVitals,
  healthcareClinicOrder,
  healthcareFollowUp,
  healthcareEncounterAddendum,
} from "#/db-schemas/encounters";
import { healthcareObservation } from "#/db-schemas/observation";
import {
  healthcarePatient,
  healthcareFamilyLink,
  healthcareAllergy,
  healthcareConsent,
  healthcareFlag,
  healthcareMergeRequest,
  healthcareCommunication,
  healthcareRecall,
  healthcareShareSlip,
} from "#/db-schemas/patient";
import {
  healthcarePsychAssessment,
  healthcareScaleResult,
  healthcareRiskFlag,
  healthcareSafetyPlan,
  healthcareCounsellingSession,
  healthcareAddictionChart,
  healthcareRelapsePlan,
  healthcareControlledPrescription,
  healthcareSideEffectCheck,
  healthcareCaregiverConsent,
} from "#/db-schemas/psych";
import {
  healthcareRehabEpisode,
  healthcareRehabAssessment,
  healthcareRehabGoal,
  healthcareRehabSitting,
  healthcareExerciseSheet,
  healthcareOutcomeScore,
  healthcareRehabDischarge,
} from "#/db-schemas/rehab";

export const emrTables: SchemaMap = {
  healthcareAddictionChart,
  healthcareAllergy,
  healthcareAyushCaseSheet,
  healthcareCaregiverConsent,
  healthcareChairSlot,
  healthcareChronicLog,
  healthcareClinicOrder,
  healthcareCommunication,
  healthcareCondition,
  healthcareConsent,
  healthcareControlledPrescription,
  healthcareCounsellingSession,
  healthcareDentalChart,
  healthcareDentalConsent,
  healthcareDietPlan,
  healthcareEncounter,
  healthcareEncounterAddendum,
  healthcareEncounterDiagnosis,
  healthcareExamFinding,
  healthcareExerciseSheet,
  healthcareFamilyLink,
  healthcareFlag,
  healthcareFollowUp,
  healthcareImmunization,
  healthcareLabJob,
  healthcareMergeRequest,
  healthcareObservation,
  healthcareOutcomeScore,
  healthcarePatient,
  healthcarePlanStage,
  healthcarePrescription,
  healthcareProblem,
  healthcarePsychAssessment,
  healthcareQuote,
  healthcareRecall,
  healthcareRegisterEntry,
  healthcareRehabAssessment,
  healthcareRehabDischarge,
  healthcareRehabEpisode,
  healthcareRehabGoal,
  healthcareRehabSitting,
  healthcareRelapsePlan,
  healthcareRepertorization,
  healthcareRiskFlag,
  healthcareSafetyPlan,
  healthcareScaleResult,
  healthcareShareSlip,
  healthcareSideEffectCheck,
  healthcareSoapNote,
  healthcareTherapyPackage,
  healthcareTherapySitting,
  healthcareTreatmentPlan,
  healthcareTriageEntry,
  healthcareVitals,
  healthcareYogaBatch,
  healthcareYogaEnrollment,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas: SchemaMap = emrTables;
