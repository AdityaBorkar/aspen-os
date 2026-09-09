import {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  COMPLIANCE_CATEGORY,
  EXPIRY_POLICY_CHANNEL,
  OBLIGATION_FREQUENCY,
  RENEWAL_FREQUENCY,
  VERIFICATION_STATUS,
} from "#/utils/constants";

import { enum_ } from "valibot";

export const ComplianceCategorySchema = enum_(COMPLIANCE_CATEGORY);

export const VerificationStatusSchema = enum_(VERIFICATION_STATUS);

export const RenewalFrequencySchema = enum_(RENEWAL_FREQUENCY);

export const ObligationFrequencySchema = enum_(OBLIGATION_FREQUENCY);

export const ExpiryPolicyChannelSchema = enum_(EXPIRY_POLICY_CHANNEL);
/** @deprecated Use ExpiryPolicyChannelSchema — harmonized to expiry_policy_* */
export const ReminderChannelSchema = ExpiryPolicyChannelSchema;

export const AuditEntityTypeSchema = enum_(AUDIT_ENTITY_TYPE);

export const AuditActionSchema = enum_(AUDIT_ACTION);
