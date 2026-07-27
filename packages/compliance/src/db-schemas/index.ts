export {
  auditActionEnum,
  auditEntityTypeEnum,
  type ComplianceAuditEntry,
  type ComplianceDocument,
  type ComplianceObligation,
  type ComplianceVerificationRule,
  complianceAuditEntry,
  complianceCategoryEnum,
  complianceDocument,
  complianceObligation,
  complianceTables,
  complianceVerificationRule,
  type NewComplianceAuditEntry,
  type NewComplianceDocument,
  type NewComplianceObligation,
  type NewComplianceVerificationRule,
  obligationFrequencyEnum,
  reminderChannelEnum,
  renewalFrequencyEnum,
  sql,
  verificationStatusEnum,
} from "../db-schema";

import { complianceTables } from "../db-schema";

export const control_plane_schemas = {} as Record<string, unknown>;

export const tenant_schemas = complianceTables;
