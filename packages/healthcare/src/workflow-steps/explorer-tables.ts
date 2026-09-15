import {
  healthcareAdvance,
  healthcareCreditDebitNote,
  healthcareInvoice,
  healthcarePackageBalance,
  healthcarePricelist,
  healthcareReceipt,
} from "#/db-schemas/billing";
import {
  healthcareNursingChecklist,
  healthcareNursingTask,
  healthcareDrugAdministration,
} from "#/db-schemas/nursing";
import {
  healthcareClinicalDocument,
  healthcareMedicalRegister,
  healthcareMessageLog,
} from "#/db-schemas/records";
import {
  healthcareDailyLog,
  healthcareGeriatricScore,
  healthcareResident,
  healthcareRound,
  healthcareStayCharge,
  healthcareVisitLog,
} from "#/db-schemas/residents";
import { healthcareAttendance, healthcareLeaveRequest, healthcareStaff } from "#/db-schemas/staff";

import type { JsonValue } from "@aspen-os/platform/server";

export const healthcareExplorerTables = {
  healthcare_advance: healthcareAdvance,
  healthcare_attendance: healthcareAttendance,
  healthcare_clinical_document: healthcareClinicalDocument,
  healthcare_credit_debit_note: healthcareCreditDebitNote,
  healthcare_daily_log: healthcareDailyLog,
  healthcare_drug_administration: healthcareDrugAdministration,
  healthcare_geriatric_score: healthcareGeriatricScore,
  healthcare_invoice: healthcareInvoice,
  healthcare_leave_request: healthcareLeaveRequest,
  healthcare_medical_register: healthcareMedicalRegister,
  healthcare_message_log: healthcareMessageLog,
  healthcare_nursing_checklist: healthcareNursingChecklist,
  healthcare_nursing_task: healthcareNursingTask,
  healthcare_package_balance: healthcarePackageBalance,
  healthcare_pricelist: healthcarePricelist,
  healthcare_receipt: healthcareReceipt,
  healthcare_resident: healthcareResident,
  healthcare_round: healthcareRound,
  healthcare_staff: healthcareStaff,
  healthcare_stay_charge: healthcareStayCharge,
  healthcare_visit_log: healthcareVisitLog,
} as const;

export type HealthcareExplorerCollection = keyof typeof healthcareExplorerTables;

export const HEALTHCARE_EXPLORER_COLLECTIONS = Object.keys(healthcareExplorerTables);

// oxlint-disable typescript/no-unnecessary-type-parameters
export function serializeExplorerRow<Row extends object>(row: Row) {
  const out: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = value instanceof Date ? value.toISOString() : value;
  }
  return out;
}
// oxlint-enable typescript/no-unnecessary-type-parameters
