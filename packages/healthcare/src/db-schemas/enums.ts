import {
  APPOINTMENT_STATUS,
  BATCH_STATUS,
  ENCOUNTER_STATUS,
  GRN_STATUS,
  INVOICE_STATUS,
  LAB_ORDER_STATUS,
  PO_STATUS,
  QUEUE_TOKEN_STATUS,
  RADIO_ORDER_STATUS,
  RESIDENT_STATUS,
  SALE_STATUS,
  SITTING_STATUS,
  TASK_STATUS,
} from "#/utils/constants";

import { pgEnum } from "drizzle-orm/pg-core";

export const healthcareAppointmentStatusEnum = pgEnum("healthcare_appointment_status", [
  APPOINTMENT_STATUS.BOOKED,
  APPOINTMENT_STATUS.CONFIRMED,
  APPOINTMENT_STATUS.CHECKED_IN,
  APPOINTMENT_STATUS.IN_QUEUE,
  APPOINTMENT_STATUS.IN_CONSULT,
  APPOINTMENT_STATUS.DONE,
  APPOINTMENT_STATUS.NO_SHOW,
  APPOINTMENT_STATUS.CANCELLED,
  APPOINTMENT_STATUS.RESCHEDULED,
]);

export const healthcareQueueTokenStatusEnum = pgEnum("healthcare_queue_token_status", [
  QUEUE_TOKEN_STATUS.WAITING,
  QUEUE_TOKEN_STATUS.CALLED,
  QUEUE_TOKEN_STATUS.SERVING,
  QUEUE_TOKEN_STATUS.DONE,
  QUEUE_TOKEN_STATUS.SKIPPED,
]);

export const healthcareEncounterStatusEnum = pgEnum("healthcare_encounter_status", [
  ENCOUNTER_STATUS.OPEN,
  ENCOUNTER_STATUS.SIGNED,
]);

export const healthcareInvoiceStatusEnum = pgEnum("healthcare_invoice_status", [
  INVOICE_STATUS.DRAFT,
  INVOICE_STATUS.FINAL,
  INVOICE_STATUS.PARTIAL,
  INVOICE_STATUS.PAID,
]);

export const healthcareLabOrderStatusEnum = pgEnum("healthcare_lab_order_status", [
  LAB_ORDER_STATUS.ORDERED,
  LAB_ORDER_STATUS.PAID,
  LAB_ORDER_STATUS.CONFIRMED,
  LAB_ORDER_STATUS.COLLECTED,
  LAB_ORDER_STATUS.RECEIVED,
  LAB_ORDER_STATUS.PROCESSING,
  LAB_ORDER_STATUS.RESULTED,
  LAB_ORDER_STATUS.AUTHORIZED,
  LAB_ORDER_STATUS.DELIVERED,
  LAB_ORDER_STATUS.BILLED,
  LAB_ORDER_STATUS.CANCELLED,
]);

export const healthcareRadioOrderStatusEnum = pgEnum("healthcare_radio_order_status", [
  RADIO_ORDER_STATUS.BOOKED,
  RADIO_ORDER_STATUS.CHECKED_IN,
  RADIO_ORDER_STATUS.PERFORMED,
  RADIO_ORDER_STATUS.REPORTED,
  RADIO_ORDER_STATUS.AUTHORIZED,
  RADIO_ORDER_STATUS.RESCHEDULED,
  RADIO_ORDER_STATUS.CANCELLED,
]);

export const healthcareTaskStatusEnum = pgEnum("healthcare_task_status", [
  TASK_STATUS.OPEN,
  TASK_STATUS.DONE,
  TASK_STATUS.OVERDUE,
  TASK_STATUS.CLOSED,
]);

export const healthcareSittingStatusEnum = pgEnum("healthcare_sitting_status", [
  SITTING_STATUS.BOOKED,
  SITTING_STATUS.ATTENDED,
  SITTING_STATUS.MISSED,
]);

export const healthcareResidentStatusEnum = pgEnum("healthcare_resident_status", [
  RESIDENT_STATUS.ENQUIRY,
  RESIDENT_STATUS.ADMITTED,
  RESIDENT_STATUS.DISCHARGED,
  RESIDENT_STATUS.TRANSFERRED,
]);

export const healthcareSaleStatusEnum = pgEnum("healthcare_sale_status", [
  SALE_STATUS.PENDING,
  SALE_STATUS.PARTIAL,
  SALE_STATUS.FULFILLED,
  SALE_STATUS.CANCELLED,
]);

export const healthcarePoStatusEnum = pgEnum("healthcare_po_status", [
  PO_STATUS.DRAFT,
  PO_STATUS.SENT,
  PO_STATUS.PARTIAL,
  PO_STATUS.CLOSED,
]);

export const healthcareGrnStatusEnum = pgEnum("healthcare_grn_status", [
  GRN_STATUS.OPEN,
  GRN_STATUS.VERIFIED,
  GRN_STATUS.BILLED,
]);

export const healthcareBatchStatusEnum = pgEnum("healthcare_batch_status", [
  BATCH_STATUS.ACTIVE,
  BATCH_STATUS.NEAR_EXPIRY,
  BATCH_STATUS.EXPIRED,
  BATCH_STATUS.QUARANTINED,
]);
