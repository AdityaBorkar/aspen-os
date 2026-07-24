import { enum_ } from "valibot";

import {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  COMPLIANCE_CATEGORY,
  OBLIGATION_FREQUENCY,
  REMINDER_CHANNEL,
  RENEWAL_FREQUENCY,
  VERIFICATION_STATUS,
} from "../constants";

export const ComplianceCategorySchema = enum_(COMPLIANCE_CATEGORY);

export const VerificationStatusSchema = enum_(VERIFICATION_STATUS);

export const RenewalFrequencySchema = enum_(RENEWAL_FREQUENCY);

export const ObligationFrequencySchema = enum_(OBLIGATION_FREQUENCY);

export const ReminderChannelSchema = enum_(REMINDER_CHANNEL);

export const AuditEntityTypeSchema = enum_(AUDIT_ENTITY_TYPE);

export const AuditActionSchema = enum_(AUDIT_ACTION);
