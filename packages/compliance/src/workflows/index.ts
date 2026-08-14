import { exportAuditEntries } from "./audit/export";
import { listAuditEntries } from "./audit/list";
import { getAuditTrail } from "./audit/trail/list";
import { invalidateCache } from "./dashboard/cache/invalidate";
import { getDashboardSummary } from "./dashboard/summary/get";
import { getActiveDocumentsForReminders } from "./document/active-for-reminders/list";
import { archiveDocument } from "./document/archive";
import { assignDocumentTo } from "./document/assign";
import { uploadDocumentAttachment } from "./document/attachment/upload";
import { getDocumentsByObligation } from "./document/by-obligation/list";
import { getDocumentsBySource } from "./document/by-source/list";
import { completeDocument } from "./document/complete";
import { createDocument } from "./document/create";
import { getDueSoonDocuments } from "./document/due-soon/list";
import { getEscalatableDocuments } from "./document/escalatable/list";
import { updateDocumentEscalatedAt } from "./document/escalated-at/update";
import { getExpiredAndOverdueDocuments } from "./document/expired-and-overdue/list";
import { getExpiredDocuments } from "./document/expired/list";
import { getExpiringDocuments } from "./document/expiring/list";
import { getDocumentById } from "./document/get";
import { listDocuments } from "./document/list";
import { updateDocumentNotifiedAt } from "./document/notified-at/update";
import { getOverdueDocuments } from "./document/overdue/list";
import { rejectDocument } from "./document/reject";
import { renewDocument } from "./document/renew";
import { getRenewalChain } from "./document/renewal-chain/get";
import { markRenewalInProgress } from "./document/renewal-in-progress/mark";
import { assignDocumentReviewer } from "./document/reviewer/assign";
import { snoozeDocument } from "./document/snooze";
import { updateDocumentStatus } from "./document/status/update";
import { submitDocument } from "./document/submit";
import { getDocumentTimeline } from "./document/timeline/get";
import { updateDocument } from "./document/update";
import { verifyDocument } from "./document/verify";
import { activateObligation } from "./obligation/activate";
import { getActiveObligations } from "./obligation/active";
import { createObligation } from "./obligation/create";
import { deactivateObligation } from "./obligation/deactivate";
import { getObligationById } from "./obligation/get";
import { listObligations } from "./obligation/list";
import { getUpcomingPeriods } from "./obligation/period/upcoming";
import { updateObligation } from "./obligation/update";
import { createVerificationRule } from "./verification/create";
import { deleteVerificationRule } from "./verification/delete";
import { getVerificationRuleById } from "./verification/get";
import { listVerificationRules } from "./verification/list";
import { matchVerificationRule } from "./verification/match";
import { updateVerificationRule } from "./verification/update";

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
