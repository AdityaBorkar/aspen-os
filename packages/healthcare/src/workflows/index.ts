import { createBranch } from "#/workflows/admin/create-branch";
import { deleteRecallRule } from "#/workflows/admin/delete-recall-rule";
import { deleteTemplate } from "#/workflows/admin/delete-template";
import { getBranch } from "#/workflows/admin/get-branch";
import { getCompany } from "#/workflows/admin/get-company";
import { listBranches } from "#/workflows/admin/list-branches";
import { listMasterVersions } from "#/workflows/admin/list-master-versions";
import { listRecallRules } from "#/workflows/admin/list-recall-rules";
import { listTemplates } from "#/workflows/admin/list-templates";
import { adminLogs } from "#/workflows/admin/logs";
import { saveCompany } from "#/workflows/admin/save-company";
import { saveMasterVersion } from "#/workflows/admin/save-master-version";
import { saveRecallRule } from "#/workflows/admin/save-recall-rule";
import { saveTemplate } from "#/workflows/admin/save-template";
import { updateBranch } from "#/workflows/admin/update-branch";
import { bookAppointment } from "#/workflows/appointments/book";
import { bookVideo } from "#/workflows/appointments/book-video";
import { callNext } from "#/workflows/appointments/call-next";
import { cancelAppointment } from "#/workflows/appointments/cancel";
import { checkinAppointment } from "#/workflows/appointments/checkin";
import { computeSlots } from "#/workflows/appointments/compute-slots";
import { getAppointment } from "#/workflows/appointments/get";
import { issueCertificate } from "#/workflows/appointments/issue-certificate";
import { issueRecall } from "#/workflows/appointments/issue-recall";
import { listAppointments } from "#/workflows/appointments/list";
import { queueBoard } from "#/workflows/appointments/queue-board";
import { rescheduleAppointment } from "#/workflows/appointments/reschedule";
import { walkinToken } from "#/workflows/appointments/walkin-token";
import { applyDiscount } from "#/workflows/billing/apply-discount";
import { cndnIssue as issueBillingCndn } from "#/workflows/billing/cndn-issue";
import { collect } from "#/workflows/billing/collect";
import { collectionReport } from "#/workflows/billing/collection-report";
import { duesAging } from "#/workflows/billing/dues-aging";
import { getInvoice } from "#/workflows/billing/get-invoice";
import { gstExport } from "#/workflows/billing/gst-export";
import { interimTab } from "#/workflows/billing/interim-tab";
import { invoiceFinalize } from "#/workflows/billing/invoice-finalize";
import { invoiceRaise } from "#/workflows/billing/invoice-raise";
import { packageExpireRun } from "#/workflows/billing/package-expire-run";
import { packageLiability } from "#/workflows/billing/package-liability";
import { packageRedeem } from "#/workflows/billing/package-redeem";
import { packageSell } from "#/workflows/billing/package-sell";
import { repriceOnPayerSwitch } from "#/workflows/billing/reprice-on-payer-switch";
import { settle } from "#/workflows/billing/settle";
import { settleAdvance } from "#/workflows/billing/settle-advance";
import { addDiagnosis } from "#/workflows/encounters/add-diagnosis";
import { addEncounterAddendum } from "#/workflows/encounters/addendum";
import { createEncounter } from "#/workflows/encounters/create";
import { getEncounter } from "#/workflows/encounters/get";
import { placeOrder } from "#/workflows/encounters/place-order";
import { prescribe } from "#/workflows/encounters/prescribe";
import { recordVitals } from "#/workflows/encounters/record-vitals";
import { refillPrescription } from "#/workflows/encounters/refill";
import { setFollowUp } from "#/workflows/encounters/set-follow-up";
import { signEncounter } from "#/workflows/encounters/sign";
import { addFacilityBlock } from "#/workflows/facilities/add-block";
import { createFacility } from "#/workflows/facilities/create";
import { getFacility } from "#/workflows/facilities/get";
import { listFacilities } from "#/workflows/facilities/list";
import { logSterilization } from "#/workflows/facilities/log-sterilization";
import { occupyFacility } from "#/workflows/facilities/occupy";
import { checkFacilityOverlap } from "#/workflows/facilities/overlap";
import { releaseFacility } from "#/workflows/facilities/release";
import { setFacilitySchedule } from "#/workflows/facilities/set-schedule";
import { facilityStatusBoard } from "#/workflows/facilities/status-board";
import { updateFacility } from "#/workflows/facilities/update";
import { auditQuery } from "#/workflows/operations/audit-query";
import { complianceEvidence } from "#/workflows/operations/compliance-evidence";
import { complianceList } from "#/workflows/operations/compliance-list";
import { explorerExportCsv } from "#/workflows/operations/explorer-export-csv";
import { explorerGrant } from "#/workflows/operations/explorer-grant";
import { explorerQuery } from "#/workflows/operations/explorer-query";
import { mastersGet } from "#/workflows/operations/masters-get";
import { mastersUpsert } from "#/workflows/operations/masters-upsert";
import { reportsDefine } from "#/workflows/operations/reports-define";
import { reportsGet } from "#/workflows/operations/reports-get";
import { reportsList } from "#/workflows/operations/reports-list";
import { reportsRun } from "#/workflows/operations/reports-run";
import { seedPresets } from "#/workflows/operations/seed-presets";
import { addAllergy } from "#/workflows/patients/add-allergy";
import { approveMerge } from "#/workflows/patients/approve-merge";
import { dedupeCheckPatients } from "#/workflows/patients/dedupe-check";
import { enrolRecall } from "#/workflows/patients/enrol-recall";
import { getPatient } from "#/workflows/patients/get";
import { linkFamily } from "#/workflows/patients/link-family";
import { listPatients } from "#/workflows/patients/list";
import { logCommunication } from "#/workflows/patients/log-communication";
import { registerPatient } from "#/workflows/patients/register";
import { requestMerge } from "#/workflows/patients/request-merge";
import { setPatientFlag } from "#/workflows/patients/set-flag";
import { shareSlip } from "#/workflows/patients/share-slip";
import { patientTimeline } from "#/workflows/patients/timeline";
import { addPractitionerEducation } from "#/workflows/practitioners/add-education";
import { addPractitionerPosting } from "#/workflows/practitioners/add-posting";
import { addPractitionerRegistration } from "#/workflows/practitioners/add-registration";
import { blockPractitionerLeave } from "#/workflows/practitioners/block-leave";
import { checkPractitionerConflict } from "#/workflows/practitioners/conflict";
import { createPractitioner } from "#/workflows/practitioners/create";
import { deactivatePractitioner } from "#/workflows/practitioners/deactivate";
import { getPractitioner } from "#/workflows/practitioners/get";
import { listPractitioners } from "#/workflows/practitioners/list";
import { nextPractitionerFreeSlot } from "#/workflows/practitioners/next-free-slot";
import { setPractitionerFee } from "#/workflows/practitioners/set-fee";
import { setPractitionerSchedule } from "#/workflows/practitioners/set-schedule";
import { updatePractitioner } from "#/workflows/practitioners/update";
import { applyBulkRevision, previewBulkRevision } from "#/workflows/pricelists/bulk-revision";
import { createPricelist } from "#/workflows/pricelists/create";
import { ensureDefaultPricelist, listPricelists } from "#/workflows/pricelists/list";
import { getPricelist, publishPricelist, retirePricelist } from "#/workflows/pricelists/publish";
import { resolveServicePrice } from "#/workflows/pricelists/resolve-price";
import { updatePricelist } from "#/workflows/pricelists/update";
import { addendumAppend } from "#/workflows/records/addendum-append";
import { dischargeIssue } from "#/workflows/records/discharge-issue";
import { dischargePending } from "#/workflows/records/discharge-pending";
import { docsAttach } from "#/workflows/records/docs-attach";
import { docsVerify } from "#/workflows/records/docs-verify";
import { encounterGet } from "#/workflows/records/encounter-get";
import { familySummary as recordsFamilySummary } from "#/workflows/records/family-summary";
import { familySummaryMulti as recordsFamilySummaryMulti } from "#/workflows/records/family-summary-multi";
import { merge } from "#/workflows/records/merge";
import { notesMask } from "#/workflows/records/notes-mask";
import { recentlyUsedRx as recordsRecentlyUsedRx } from "#/workflows/records/recently-used-rx";
import { registersAppend } from "#/workflows/records/registers-append";
import { registersExport } from "#/workflows/records/registers-export";
import { registersVoid } from "#/workflows/records/registers-void";
import { retentionCheck } from "#/workflows/records/retention-check";
import { search as searchRecords } from "#/workflows/records/search";
import { sharePrint } from "#/workflows/records/share-print";
import { shareWhatsapp } from "#/workflows/records/share-whatsapp";
import { timeline as recordsTimeline } from "#/workflows/records/timeline";
import { addDiscountRule } from "#/workflows/services/add-discount-rule";
import { createService } from "#/workflows/services/create";
import { definePackage } from "#/workflows/services/define-package";
import { getService } from "#/workflows/services/get";
import { listServices } from "#/workflows/services/list";
import { mapServiceFacilities } from "#/workflows/services/map-facilities";
import { publishService } from "#/workflows/services/publish";
import { redeemPackage } from "#/workflows/services/redeem";
import { retireService } from "#/workflows/services/retire";
import { setServicePrice } from "#/workflows/services/set-price";
import { updateService } from "#/workflows/services/update";

export const admin = {
  createBranch,
  deleteRecallRule,
  deleteTemplate,
  getBranch,
  getCompany,
  listBranches,
  listMasterVersions,
  listRecallRules,
  listTemplates,
  logs: adminLogs,
  saveCompany,
  saveMasterVersion,
  saveRecallRule,
  saveTemplate,
  updateBranch,
} as const;

export const appointments = {
  book: bookAppointment,
  bookVideo,
  callNext,
  cancel: cancelAppointment,
  checkin: checkinAppointment,
  computeSlots,
  get: getAppointment,
  issueCertificate,
  issueRecall,
  list: listAppointments,
  queueBoard,
  reschedule: rescheduleAppointment,
  walkinToken,
} as const;

export const billing = {
  applyDiscount,
  cndnIssue: issueBillingCndn,
  collect,
  collectionReport,
  duesAging,
  getInvoice,
  gstExport,
  interimTab,
  invoiceFinalize,
  invoiceRaise,
  packageExpireRun,
  packageLiability,
  packageRedeem,
  packageSell,
  repriceOnPayerSwitch,
  settle,
  settleAdvance,
} as const;

export const encounters = {
  addDiagnosis,
  addendum: addEncounterAddendum,
  create: createEncounter,
  get: getEncounter,
  placeOrder,
  prescribe,
  recordVitals,
  refill: refillPrescription,
  setFollowUp,
  sign: signEncounter,
} as const;

export const facilities = {
  addBlock: addFacilityBlock,
  create: createFacility,
  get: getFacility,
  list: listFacilities,
  logSterilization,
  occupy: occupyFacility,
  overlap: checkFacilityOverlap,
  release: releaseFacility,
  setSchedule: setFacilitySchedule,
  statusBoard: facilityStatusBoard,
  update: updateFacility,
} as const;

export const operations = {
  auditQuery,
  complianceEvidence,
  complianceList,
  explorerExportCsv,
  explorerGrant,
  explorerQuery,
  mastersGet,
  mastersUpsert,
  reportsDefine,
  reportsGet,
  reportsList,
  reportsRun,
  seedPresets,
} as const;

export const patients = {
  addAllergy,
  approveMerge,
  dedupeCheck: dedupeCheckPatients,
  enrolRecall,
  get: getPatient,
  linkFamily,
  list: listPatients,
  logCommunication,
  register: registerPatient,
  requestMerge,
  setFlag: setPatientFlag,
  shareSlip,
  timeline: patientTimeline,
} as const;

export const practitioners = {
  addEducation: addPractitionerEducation,
  addPosting: addPractitionerPosting,
  addRegistration: addPractitionerRegistration,
  blockLeave: blockPractitionerLeave,
  conflict: checkPractitionerConflict,
  create: createPractitioner,
  deactivate: deactivatePractitioner,
  get: getPractitioner,
  list: listPractitioners,
  nextFreeSlot: nextPractitionerFreeSlot,
  setFee: setPractitionerFee,
  setSchedule: setPractitionerSchedule,
  update: updatePractitioner,
} as const;

export const pricelists = {
  applyBulkRevision,
  create: createPricelist,
  ensureDefault: ensureDefaultPricelist,
  get: getPricelist,
  list: listPricelists,
  previewBulkRevision,
  publish: publishPricelist,
  resolvePrice: resolveServicePrice,
  retire: retirePricelist,
  update: updatePricelist,
} as const;

export const records = {
  addendumAppend,
  dischargeIssue,
  dischargePending,
  docsAttach,
  docsVerify,
  encounterGet,
  familySummary: recordsFamilySummary,
  familySummaryMulti: recordsFamilySummaryMulti,
  merge,
  notesMask,
  recentlyUsedRx: recordsRecentlyUsedRx,
  registersAppend,
  registersExport,
  registersVoid,
  retentionCheck,
  search: searchRecords,
  sharePrint,
  shareWhatsapp,
  timeline: recordsTimeline,
} as const;

export const services = {
  addDiscountRule,
  create: createService,
  definePackage,
  get: getService,
  list: listServices,
  mapFacilities: mapServiceFacilities,
  publish: publishService,
  redeem: redeemPackage,
  retire: retireService,
  setPrice: setServicePrice,
  update: updateService,
} as const;
