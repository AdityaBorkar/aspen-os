import { exportAuditEntries } from "./audit.export";
import { listAuditEntries } from "./audit.list";
import { getAuditTrail } from "./audit.trail";
import { invalidateCache } from "./dashboard.invalidate-cache";
import { getDashboardSummary } from "./dashboard.summary";
import { getActiveDocumentsForReminders } from "./document.active-for-reminders";
import { archiveDocument } from "./document.archive";
import { assignDocumentReviewer } from "./document.assign-reviewer";
import { assignDocumentTo } from "./document.assign-to";
import { getDocumentsByObligation } from "./document.by-obligation";
import { getDocumentsBySource } from "./document.by-source";
import { completeDocument } from "./document.complete";
import { createDocument } from "./document.create";
import { getDueSoonDocuments } from "./document.due-soon";
import { getEscalatableDocuments } from "./document.escalatable";
import { getExpiredDocuments } from "./document.expired";
import { getExpiredAndOverdueDocuments } from "./document.expired-and-overdue";
import { getExpiringDocuments } from "./document.expiring";
import { getDocumentById } from "./document.get";
import { listDocuments } from "./document.list";
import { markRenewalInProgress } from "./document.mark-renewal-in-progress";
import { getOverdueDocuments } from "./document.overdue";
import { rejectDocument } from "./document.reject";
import { renewDocument } from "./document.renew";
import { getRenewalChain } from "./document.renewal-chain";
import { snoozeDocument } from "./document.snooze";
import { submitDocument } from "./document.submit";
import { getDocumentTimeline } from "./document.timeline";
import { updateDocument } from "./document.update";
import { updateDocumentEscalatedAt } from "./document.update-escalated-at";
import { updateDocumentNotifiedAt } from "./document.update-notified-at";
import { updateDocumentStatus } from "./document.update-status";
import { uploadDocumentAttachment } from "./document.upload-attachment";
import { verifyDocument } from "./document.verify";
import { activateObligation } from "./obligation.activate";
import { getActiveObligations } from "./obligation.active";
import { createObligation } from "./obligation.create";
import { deactivateObligation } from "./obligation.deactivate";
import { getObligationById } from "./obligation.get";
import { listObligations } from "./obligation.list";
import { getUpcomingPeriods } from "./obligation.upcoming-periods";
import { updateObligation } from "./obligation.update";
import { createVerificationRule } from "./verification.create";
import { deleteVerificationRule } from "./verification.delete";
import { getVerificationRuleById } from "./verification.get";
import { listVerificationRules } from "./verification.list";
import { matchVerificationRule } from "./verification.match";
import { updateVerificationRule } from "./verification.update";

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
