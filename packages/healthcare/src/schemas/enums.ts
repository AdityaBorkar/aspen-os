import {
  CONDITION_CLINICAL_VALUES,
  CONDITION_VERIFICATION_VALUES,
  MEDREQ_INTENT_VALUES,
  MEDREQ_STATUS_VALUES,
} from "#/fhir/registries";
import {
  APPOINTMENT_STATUS,
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  BATCH_STATUS,
  CERTIFICATE_STATUS,
  CONSENT_STATUS,
  COUNSELLING_STATUS,
  DAILY_LOG_STATUS,
  DIAGNOSIS_KIND,
  DRUG_ADMIN_STATUS,
  ENCOUNTER_STATUS,
  GRN_STATUS,
  HANDOVER_STATUS,
  INVOICE_STATUS,
  LAB_JOB_STATUS,
  LAB_ORDER_STATUS,
  LEAVE_STATUS,
  MESSAGE_STATUS,
  ORDER_KIND,
  ORDER_STATUS,
  PACKAGE_STATUS,
  PLAN_STATUS,
  PO_STATUS,
  QUOTE_STATUS,
  QUEUE_TOKEN_STATUS,
  RADIO_ORDER_STATUS,
  REGISTER_STATUS,
  REHAB_SITTING_STATUS,
  REPORT_STATUS,
  RESIDENT_STATUS,
  RISK_LEVEL,
  SALE_STATUS,
  SAMPLE_STATUS,
  SITTING_STATUS,
  STAGE_STATUS,
  TASK_STATUS,
  THERAPY_PACKAGE_STATUS,
  VIDEO_STATUS,
  VISIT_TYPE,
} from "#/utils/constants";

import { picklist } from "valibot";

export const AppointmentStatusSchema = picklist([
  ...Object.values(APPOINTMENT_STATUS),
  "proposed",
  "pending",
  "arrived",
  "fulfilled",
  "noshow",
]);

export const QueueTokenStatusSchema = picklist(Object.values(QUEUE_TOKEN_STATUS));

export const VideoStatusSchema = picklist(Object.values(VIDEO_STATUS));

export const CertificateStatusSchema = picklist(Object.values(CERTIFICATE_STATUS));

export const EncounterStatusSchema = picklist([
  ...Object.values(ENCOUNTER_STATUS),
  "in-progress",
  "finished",
]);

export const VisitTypeSchema = picklist(Object.values(VISIT_TYPE));

export const DiagnosisKindSchema = picklist(Object.values(DIAGNOSIS_KIND));

export const OrderStatusSchema = picklist(Object.values(ORDER_STATUS));

export const OrderKindSchema = picklist(Object.values(ORDER_KIND));

export const PlanStatusSchema = picklist(Object.values(PLAN_STATUS));

export const StageStatusSchema = picklist(Object.values(STAGE_STATUS));

export const QuoteStatusSchema = picklist(Object.values(QUOTE_STATUS));

export const ConsentStatusSchema = picklist(Object.values(CONSENT_STATUS));

export const LabJobStatusSchema = picklist(Object.values(LAB_JOB_STATUS));

export const TherapyPackageStatusSchema = picklist(Object.values(THERAPY_PACKAGE_STATUS));

export const SittingStatusSchema = picklist(Object.values(SITTING_STATUS));

export const RehabSittingStatusSchema = picklist(Object.values(REHAB_SITTING_STATUS));

export const CounsellingStatusSchema = picklist(Object.values(COUNSELLING_STATUS));

export const RiskLevelSchema = picklist(Object.values(RISK_LEVEL));

export const ResidentStatusSchema = picklist(Object.values(RESIDENT_STATUS));

export const DailyLogStatusSchema = picklist(Object.values(DAILY_LOG_STATUS));

export const InvoiceStatusSchema = picklist(Object.values(INVOICE_STATUS));

// Canonical alias axis (HEALTHCARE-SPEC §3.2): ledger writes stay on
// InvoiceStatusSchema, while boundaries accept every legacy + canonical
// literal. Canonical inputs normalize to the ledger before any column
// comparison, and reads project fhir_status via the forward map.
export const InvoiceStatusAliasSchema = picklist([
  ...Object.values(INVOICE_STATUS),
  "issued",
  "balanced",
  "cancelled",
  "entered-in-error",
]);

// Canonical Condition axes (HEALTHCARE-SPEC §§3.2, 5). Stored on
// healthcare_condition; legacy kind/status inputs normalize into these.
export const ConditionClinicalStatusSchema = picklist(CONDITION_CLINICAL_VALUES);

export const ConditionVerificationStatusSchema = picklist(CONDITION_VERIFICATION_VALUES);

// Canonical MedicationRequest axes (HEALTHCARE-SPEC §§3.2, 8). New
// prescription headers default to active/order; stored in payload.fhir
// until a columnar promotion ships.
export const MedicationRequestStatusSchema = picklist(MEDREQ_STATUS_VALUES);

export const MedicationRequestIntentSchema = picklist(MEDREQ_INTENT_VALUES);

// Canonical observation profile hints (HEALTHCARE-SPEC §6). Each charting
// workflow fixes its own profile; callers may echo the hint for
// forward-compatibility. Values double as the provenance source.
export const ObservationProfileHintSchema = picklist([
  "encounter-intake",
  "triage",
  "bedside",
  "laboratory",
]);

export const PackageStatusSchema = picklist(Object.values(PACKAGE_STATUS));

export const SaleStatusSchema = picklist(Object.values(SALE_STATUS));

export const PoStatusSchema = picklist(Object.values(PO_STATUS));

export const GrnStatusSchema = picklist(Object.values(GRN_STATUS));

export const BatchStatusSchema = picklist(Object.values(BATCH_STATUS));

export const LabOrderStatusSchema = picklist(Object.values(LAB_ORDER_STATUS));

export const SampleStatusSchema = picklist(Object.values(SAMPLE_STATUS));

export const RadioOrderStatusSchema = picklist(Object.values(RADIO_ORDER_STATUS));

export const TaskStatusSchema = picklist(Object.values(TASK_STATUS));

export const DrugAdminStatusSchema = picklist(Object.values(DRUG_ADMIN_STATUS));

export const HandoverStatusSchema = picklist(Object.values(HANDOVER_STATUS));

export const RegisterStatusSchema = picklist(Object.values(REGISTER_STATUS));

export const MessageStatusSchema = picklist(Object.values(MESSAGE_STATUS));

export const ReportStatusSchema = picklist(Object.values(REPORT_STATUS));

export const LeaveStatusSchema = picklist(Object.values(LEAVE_STATUS));

export const AuditActionSchema = picklist(Object.values(AUDIT_ACTION));

export const AuditEntityTypeSchema = picklist(Object.values(AUDIT_ENTITY_TYPE));

export {
  APPOINTMENT_STATUS,
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  BATCH_STATUS,
  CERTIFICATE_STATUS,
  CONSENT_STATUS,
  COUNSELLING_STATUS,
  DAILY_LOG_STATUS,
  DIAGNOSIS_KIND,
  DRUG_ADMIN_STATUS,
  ENCOUNTER_STATUS,
  GRN_STATUS,
  HANDOVER_STATUS,
  INVOICE_STATUS,
  LAB_JOB_STATUS,
  LAB_ORDER_STATUS,
  LEAVE_STATUS,
  MESSAGE_STATUS,
  ORDER_KIND,
  ORDER_STATUS,
  PACKAGE_STATUS,
  PLAN_STATUS,
  PO_STATUS,
  QUOTE_STATUS,
  QUEUE_TOKEN_STATUS,
  RADIO_ORDER_STATUS,
  REGISTER_STATUS,
  REHAB_SITTING_STATUS,
  REPORT_STATUS,
  RESIDENT_STATUS,
  RISK_LEVEL,
  SALE_STATUS,
  SAMPLE_STATUS,
  SITTING_STATUS,
  STAGE_STATUS,
  TASK_STATUS,
  THERAPY_PACKAGE_STATUS,
  VIDEO_STATUS,
  VISIT_TYPE,
};
