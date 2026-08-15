import { exportAuditEntries } from "#/workflows/audit/export";
import { listAuditEntries } from "#/workflows/audit/list";
import { getAuditTrail } from "#/workflows/audit/trail/list";
import { invalidateCache } from "#/workflows/dashboard/cache/invalidate";
import { getDashboardSummary } from "#/workflows/dashboard/summary/get";
import { getActiveDocumentsForReminders } from "#/workflows/document/active-for-reminders/list";
import { archiveDocument } from "#/workflows/document/archive";
import { assignDocumentTo } from "#/workflows/document/assign";
import { uploadDocumentAttachment } from "#/workflows/document/attachment/upload";
import { getDocumentsByObligation } from "#/workflows/document/by-obligation/list";
import { getDocumentsBySource } from "#/workflows/document/by-source/list";
import { completeDocument } from "#/workflows/document/complete";
import { createDocument } from "#/workflows/document/create";
import { getDueSoonDocuments } from "#/workflows/document/due-soon/list";
import { getEscalatableDocuments } from "#/workflows/document/escalatable/list";
import { updateDocumentEscalatedAt } from "#/workflows/document/escalated-at/update";
import { getExpiredAndOverdueDocuments } from "#/workflows/document/expired-and-overdue/list";
import { getExpiredDocuments } from "#/workflows/document/expired/list";
import { getExpiringDocuments } from "#/workflows/document/expiring/list";
import { getDocumentById } from "#/workflows/document/get";
import { listDocuments } from "#/workflows/document/list";
import { updateDocumentNotifiedAt } from "#/workflows/document/notified-at/update";
import { getOverdueDocuments } from "#/workflows/document/overdue/list";
import { rejectDocument } from "#/workflows/document/reject";
import { renewDocument } from "#/workflows/document/renew";
import { getRenewalChain } from "#/workflows/document/renewal-chain/get";
import { markRenewalInProgress } from "#/workflows/document/renewal-in-progress/mark";
import { assignDocumentReviewer } from "#/workflows/document/reviewer/assign";
import { snoozeDocument } from "#/workflows/document/snooze";
import { updateDocumentStatus } from "#/workflows/document/status/update";
import { submitDocument } from "#/workflows/document/submit";
import { getDocumentTimeline } from "#/workflows/document/timeline/get";
import { updateDocument } from "#/workflows/document/update";
import { verifyDocument } from "#/workflows/document/verify";
import { activateObligation } from "#/workflows/obligation/activate";
import { getActiveObligations } from "#/workflows/obligation/active";
import { createObligation } from "#/workflows/obligation/create";
import { deactivateObligation } from "#/workflows/obligation/deactivate";
import { getObligationById } from "#/workflows/obligation/get";
import { listObligations } from "#/workflows/obligation/list";
import { getUpcomingPeriods } from "#/workflows/obligation/period/upcoming";
import { updateObligation } from "#/workflows/obligation/update";
import { createVerificationRule } from "#/workflows/verification/create";
import { deleteVerificationRule } from "#/workflows/verification/delete";
import { getVerificationRuleById } from "#/workflows/verification/get";
import { listVerificationRules } from "#/workflows/verification/list";
import { matchVerificationRule } from "#/workflows/verification/match";
import { updateVerificationRule } from "#/workflows/verification/update";

export const audit = {
  export: exportAuditEntries,
  getAuditTrail,
  list: listAuditEntries,
} as const;

export const dashboard = {
  getSummary: getDashboardSummary,
  invalidateCache,
} as const;

export const documents = {
  archive: archiveDocument,
  assignReviewer: assignDocumentReviewer,
  assignTo: assignDocumentTo,
  complete: completeDocument,
  create: createDocument,
  get: getDocumentById,
  getActiveDocumentsForReminders,
  getByObligation: getDocumentsByObligation,
  getBySource: getDocumentsBySource,
  getDueSoonDocuments,
  getEscalatableDocuments,
  getExpiredAndOverdueDocuments,
  getExpiredDocuments,
  getExpiringDocuments,
  getOverdueDocuments,
  getRenewalChain,
  getTimeline: getDocumentTimeline,
  list: listDocuments,
  markRenewalInProgress,
  reject: rejectDocument,
  renew: renewDocument,
  snooze: snoozeDocument,
  submit: submitDocument,
  update: updateDocument,
  updateEscalatedAt: updateDocumentEscalatedAt,
  updateNotifiedAt: updateDocumentNotifiedAt,
  updateStatus: updateDocumentStatus,
  uploadAttachment: uploadDocumentAttachment,
  verify: verifyDocument,
} as const;

export const obligations = {
  activate: activateObligation,
  create: createObligation,
  deactivate: deactivateObligation,
  get: getObligationById,
  getActive: getActiveObligations,
  getById: getObligationById,
  getUpcomingPeriods,
  list: listObligations,
  update: updateObligation,
} as const;

export const verification = {
  create: createVerificationRule,
  delete: deleteVerificationRule,
  get: getVerificationRuleById,
  getById: getVerificationRuleById,
  list: listVerificationRules,
  match: matchVerificationRule,
  update: updateVerificationRule,
} as const;
