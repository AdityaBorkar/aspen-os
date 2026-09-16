import type { SchemaMap } from "@aspen-os/platform/server";

export { healthcareCounter } from "#/db-schemas/counter";
export {
  healthcareLabTest,
  healthcareLabPanel,
  healthcareLabOrder,
  healthcareLabSample,
  healthcareLabResult,
  healthcareRadioBooking,
  healthcareRadioReport,
  healthcareQcLog,
} from "#/db-schemas/diagnostics";
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

import { healthcareCounter } from "#/db-schemas/counter";
import {
  healthcareLabTest,
  healthcareLabPanel,
  healthcareLabOrder,
  healthcareLabSample,
  healthcareLabResult,
  healthcareRadioBooking,
  healthcareRadioReport,
  healthcareQcLog,
} from "#/db-schemas/diagnostics";
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

export const diagnosticsTables: SchemaMap = {
  healthcareClinicOrder,
  healthcareCounter,
  healthcareEncounter,
  healthcareEncounterAddendum,
  healthcareEncounterDiagnosis,
  healthcareFollowUp,
  healthcareLabOrder,
  healthcareLabPanel,
  healthcareLabResult,
  healthcareLabSample,
  healthcareLabTest,
  healthcareObservation,
  healthcarePrescription,
  healthcareQcLog,
  healthcareRadioBooking,
  healthcareRadioReport,
  healthcareVitals,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas: SchemaMap = diagnosticsTables;
