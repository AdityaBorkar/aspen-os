import type { SchemaMap } from "@aspen-os/platform/server";

export {
  healthcareNursingTask,
  healthcareNursingNote,
  healthcareNursingVitals,
  healthcareIoEntry,
  healthcarePainScore,
  healthcareNursingRiskScreen,
  healthcareDrugAdministration,
  healthcareNursingEscalation,
  healthcareDaycareSitting,
  healthcareNursingChecklist,
  healthcareHandover,
  healthcareTriageTag,
} from "#/db-schemas/nursing";
export {
  healthcareResident,
  healthcareBedAssignment,
  healthcareGeriatricScore,
  healthcarePolypharmacyReview,
  healthcareDailyLog,
  healthcareRound,
  healthcareVisitLog,
  healthcareStayCharge,
} from "#/db-schemas/residents";
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
export {
  healthcareInvoice,
  healthcareReceipt,
  healthcarePackageBalance,
  healthcarePricelist,
  healthcareCreditDebitNote,
  healthcareAdvance,
} from "#/db-schemas/billing";
export { healthcareCounter } from "#/db-schemas/counter";

import {
  healthcareInvoice,
  healthcareReceipt,
  healthcarePackageBalance,
  healthcarePricelist,
  healthcareCreditDebitNote,
  healthcareAdvance,
} from "#/db-schemas/billing";
import { healthcareCounter } from "#/db-schemas/counter";
import {
  healthcareEncounter,
  healthcareEncounterDiagnosis,
  healthcarePrescription,
  healthcareVitals,
  healthcareClinicOrder,
  healthcareFollowUp,
  healthcareEncounterAddendum,
} from "#/db-schemas/encounters";
import {
  healthcareNursingTask,
  healthcareNursingNote,
  healthcareNursingVitals,
  healthcareIoEntry,
  healthcarePainScore,
  healthcareNursingRiskScreen,
  healthcareDrugAdministration,
  healthcareNursingEscalation,
  healthcareDaycareSitting,
  healthcareNursingChecklist,
  healthcareHandover,
  healthcareTriageTag,
} from "#/db-schemas/nursing";
import { healthcareObservation } from "#/db-schemas/observation";
import {
  healthcareResident,
  healthcareBedAssignment,
  healthcareGeriatricScore,
  healthcarePolypharmacyReview,
  healthcareDailyLog,
  healthcareRound,
  healthcareVisitLog,
  healthcareStayCharge,
} from "#/db-schemas/residents";

export const inpatientTables: SchemaMap = {
  healthcareAdvance,
  healthcareBedAssignment,
  healthcareClinicOrder,
  healthcareCounter,
  healthcareCreditDebitNote,
  healthcareDailyLog,
  healthcareDaycareSitting,
  healthcareDrugAdministration,
  healthcareEncounter,
  healthcareEncounterAddendum,
  healthcareEncounterDiagnosis,
  healthcareFollowUp,
  healthcareGeriatricScore,
  healthcareHandover,
  healthcareInvoice,
  healthcareIoEntry,
  healthcareNursingChecklist,
  healthcareNursingEscalation,
  healthcareNursingNote,
  healthcareNursingRiskScreen,
  healthcareNursingTask,
  healthcareNursingVitals,
  healthcareObservation,
  healthcarePackageBalance,
  healthcarePainScore,
  healthcarePolypharmacyReview,
  healthcarePrescription,
  healthcarePricelist,
  healthcareReceipt,
  healthcareResident,
  healthcareRound,
  healthcareStayCharge,
  healthcareTriageTag,
  healthcareVisitLog,
  healthcareVitals,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas: SchemaMap = inpatientTables;
