import { createBranch } from "#/workflows/admin/create-branch";
import { deleteRecallRule } from "#/workflows/admin/delete-recall-rule";
import { deleteTemplate } from "#/workflows/admin/delete-template";
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
import { checkInteraction } from "#/workflows/allopathy/interaction-check";
import { listSoap } from "#/workflows/allopathy/list-soap";
import { logChronic } from "#/workflows/allopathy/log-chronic";
import { problemList } from "#/workflows/allopathy/problem-list";
import { problemUpsert } from "#/workflows/allopathy/problem-upsert";
import { recordImmunization } from "#/workflows/allopathy/record-immunization";
import { registerEntry } from "#/workflows/allopathy/register-entry";
import { saveExam } from "#/workflows/allopathy/save-exam";
import { saveSoap } from "#/workflows/allopathy/save-soap";
import { triageEntry } from "#/workflows/allopathy/triage-entry";
import { bookAppointment } from "#/workflows/appointments/book";
import { bookVideo } from "#/workflows/appointments/book-video";
import { callNext } from "#/workflows/appointments/call-next";
import { cancelAppointment } from "#/workflows/appointments/cancel";
import { captureConsent } from "#/workflows/appointments/capture-consent";
import { checkinAppointment } from "#/workflows/appointments/checkin";
import { computeSlots } from "#/workflows/appointments/compute-slots";
import { getAppointment } from "#/workflows/appointments/get";
import { issueCertificate } from "#/workflows/appointments/issue-certificate";
import { issueRecall } from "#/workflows/appointments/issue-recall";
import { listAppointments } from "#/workflows/appointments/list";
import { queueBoard } from "#/workflows/appointments/queue-board";
import { rescheduleAppointment } from "#/workflows/appointments/reschedule";
import { walkinToken } from "#/workflows/appointments/walkin-token";
import { bookNadi } from "#/workflows/ayush/book-nadi";
import { createYogaBatch } from "#/workflows/ayush/create-yoga-batch";
import { dualCode } from "#/workflows/ayush/dual-code";
import { enrollYoga } from "#/workflows/ayush/enroll-yoga";
import { listFollowUpGrid, saveFollowUpGrid } from "#/workflows/ayush/followup-grid";
import { issueDiet } from "#/workflows/ayush/issue-diet";
import { pauseExtendPackage } from "#/workflows/ayush/pause-extend-package";
import { recordSitting as recordAyushSitting } from "#/workflows/ayush/record-sitting";
import { repertorize } from "#/workflows/ayush/repertorize";
import { saveCaseSheet } from "#/workflows/ayush/save-case-sheet";
import { scheduleTherapy } from "#/workflows/ayush/schedule-therapy";
import { sellPackage } from "#/workflows/ayush/sell-package";
import {
  markYogaAttendance,
  prescribeAyush,
  recordPackageOutcome,
} from "#/workflows/ayush/yoga-attendance";
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
import { pricelistUpsert } from "#/workflows/billing/pricelist-upsert";
import { repriceOnPayerSwitch } from "#/workflows/billing/reprice-on-payer-switch";
import { settle } from "#/workflows/billing/settle";
import { settleAdvance } from "#/workflows/billing/settle-advance";
import { bookChair } from "#/workflows/dental/book-chair";
import { buildPlan } from "#/workflows/dental/build-plan";
import { chart } from "#/workflows/dental/chart";
import { closeStage } from "#/workflows/dental/close-stage";
import { consent } from "#/workflows/dental/consent";
import { implantMilestone, sellDentalPackage } from "#/workflows/dental/implant-milestone";
import { pendingJobs } from "#/workflows/dental/pending-jobs";
import { quote } from "#/workflows/dental/quote";
import { raiseLabJob } from "#/workflows/dental/raise-lab-job";
import { rescheduleStage } from "#/workflows/dental/reschedule-stage";
import { trackLabJob } from "#/workflows/dental/track-lab-job";
import { addonTest } from "#/workflows/diagnostics/addon-test";
import { authorize as authorizeDiagnostics } from "#/workflows/diagnostics/authorize";
import { cancelOrder as cancelDiagnosticsOrder } from "#/workflows/diagnostics/cancel-order";
import { collectSample } from "#/workflows/diagnostics/collect-sample";
import { criticalAck } from "#/workflows/diagnostics/critical-ack";
import { deliver as deliverDiagnostics } from "#/workflows/diagnostics/deliver";
import { getOrder as getDiagnosticsOrder } from "#/workflows/diagnostics/get-order";
import { orderLabs } from "#/workflows/diagnostics/order-labs";
import { panelCreate } from "#/workflows/diagnostics/panel-create";
import { processingStart } from "#/workflows/diagnostics/processing-start";
import { qcLog } from "#/workflows/diagnostics/qc-log";
import { queue as diagnosticsQueue } from "#/workflows/diagnostics/queue";
import { radioAuthorize } from "#/workflows/diagnostics/radio-authorize";
import { radioBook } from "#/workflows/diagnostics/radio-book";
import { radioCheckin } from "#/workflows/diagnostics/radio-checkin";
import { radioReportAttach } from "#/workflows/diagnostics/radio-report-attach";
import { radioReschedule } from "#/workflows/diagnostics/radio-reschedule";
import { receiveSample } from "#/workflows/diagnostics/receive-sample";
import { resultEnter } from "#/workflows/diagnostics/result-enter";
import { sampleReject } from "#/workflows/diagnostics/sample-reject";
import { tatReport } from "#/workflows/diagnostics/tat-report";
import { testMasterUpsert } from "#/workflows/diagnostics/test-master-upsert";
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
import { board as nursingBoard } from "#/workflows/nursing/board";
import { checklistRecord } from "#/workflows/nursing/checklist-record";
import { drugAdminister } from "#/workflows/nursing/drug-administer";
import { handoverCompile } from "#/workflows/nursing/handover-compile";
import { handoverSign } from "#/workflows/nursing/handover-sign";
import { ioChart } from "#/workflows/nursing/io-chart";
import { missedEscalate } from "#/workflows/nursing/missed-escalate";
import { painScore } from "#/workflows/nursing/pain-score";
import { recordNote as recordNursingNote } from "#/workflows/nursing/record-note";
import { riskScreen } from "#/workflows/nursing/risk-screen";
import { sittingsSupport } from "#/workflows/nursing/sittings-support";
import { tasksFromOrders } from "#/workflows/nursing/tasks-from-orders";
import { triageTag } from "#/workflows/nursing/triage-tag";
import { vitalsChart } from "#/workflows/nursing/vitals-chart";
import { auditQuery } from "#/workflows/operations/audit-query";
import { branchesCreate } from "#/workflows/operations/branches-create";
import { branchesGet } from "#/workflows/operations/branches-get";
import { branchesList } from "#/workflows/operations/branches-list";
import { complianceEvidence } from "#/workflows/operations/compliance-evidence";
import { complianceList } from "#/workflows/operations/compliance-list";
import { explorerExportCsv } from "#/workflows/operations/explorer-export-csv";
import { explorerGrant } from "#/workflows/operations/explorer-grant";
import { explorerQuery } from "#/workflows/operations/explorer-query";
import { mastersGet } from "#/workflows/operations/masters-get";
import { mastersUpsert } from "#/workflows/operations/masters-upsert";
import { messagingOptOut } from "#/workflows/operations/messaging-optout";
import { messagingRetry } from "#/workflows/operations/messaging-retry";
import { messagingSend } from "#/workflows/operations/messaging-send";
import { reportsDefine } from "#/workflows/operations/reports-define";
import { reportsGet } from "#/workflows/operations/reports-get";
import { reportsList } from "#/workflows/operations/reports-list";
import { reportsRun } from "#/workflows/operations/reports-run";
import { seedPresets } from "#/workflows/operations/seed-presets";
import { addAllergy } from "#/workflows/patients/add-allergy";
import { approveMerge } from "#/workflows/patients/approve-merge";
import { archiveConsent } from "#/workflows/patients/archive-consent";
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
import { batchReceive } from "#/workflows/pharmacy/batch-receive";
import { cndnIssue as issuePharmacyCndn } from "#/workflows/pharmacy/cndn-issue";
import { expiryAlerts } from "#/workflows/pharmacy/expiry-alerts";
import { getSale } from "#/workflows/pharmacy/get-sale";
import { grnVerify } from "#/workflows/pharmacy/grn-verify";
import { itemUpsert } from "#/workflows/pharmacy/item-upsert";
import { partialClose } from "#/workflows/pharmacy/partial-close";
import { piBook } from "#/workflows/pharmacy/pi-book";
import { poCreate } from "#/workflows/pharmacy/po-create";
import { reorderSuggest } from "#/workflows/pharmacy/reorder-suggest";
import { returnAgainstBill } from "#/workflows/pharmacy/return-against-bill";
import { saleFromRx } from "#/workflows/pharmacy/sale-from-rx";
import { stockCorrect } from "#/workflows/pharmacy/stock-correct";
import { stockLedger } from "#/workflows/pharmacy/stock-ledger";
import { transfer } from "#/workflows/pharmacy/transfer";
import { transferAccept } from "#/workflows/pharmacy/transfer-accept";
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
import { alertSenior } from "#/workflows/psych/alert-senior";
import { assess as assessPsych } from "#/workflows/psych/assess";
import { bookCounselling } from "#/workflows/psych/book-counselling";
import { bookTele } from "#/workflows/psych/book-tele";
import { caregiverConsent } from "#/workflows/psych/caregiver-consent";
import { chartWithdrawal } from "#/workflows/psych/chart-withdrawal";
import { closeReadiness as closePsychReadiness } from "#/workflows/psych/close-readiness";
import { involuntaryHook } from "#/workflows/psych/involuntary-hook";
import { prescribeControlled } from "#/workflows/psych/prescribe-controlled";
import { recallList as psychRecallList } from "#/workflows/psych/recall-list";
import { relapsePlan } from "#/workflows/psych/relapse-plan";
import { saveSafetyPlan } from "#/workflows/psych/save-safety-plan";
import { scoreScale } from "#/workflows/psych/score-scale";
import { screenRisk } from "#/workflows/psych/screen-risk";
import { sideEffectCheck } from "#/workflows/psych/side-effect-check";
import { addendumAppend } from "#/workflows/records/addendum-append";
import { consentsGet } from "#/workflows/records/consents-get";
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
import { recordConsent } from "#/workflows/records/record-consent";
import { registersAppend } from "#/workflows/records/registers-append";
import { registersExport } from "#/workflows/records/registers-export";
import { registersVoid } from "#/workflows/records/registers-void";
import { retentionCheck } from "#/workflows/records/retention-check";
import { search as searchRecords } from "#/workflows/records/search";
import { sharePrint } from "#/workflows/records/share-print";
import { shareWhatsapp } from "#/workflows/records/share-whatsapp";
import { timeline as recordsTimeline } from "#/workflows/records/timeline";
import { assess as assessRehab } from "#/workflows/rehab/assess";
import { bookSitting as bookRehabSitting } from "#/workflows/rehab/book-sitting";
import { buildPackage as buildRehabPackage } from "#/workflows/rehab/build-package";
import { dayBoard as rehabDayBoard } from "#/workflows/rehab/day-board";
import { discharge as dischargeRehab } from "#/workflows/rehab/discharge";
import { exerciseSheet } from "#/workflows/rehab/exercise-sheet";
import { openEpisode } from "#/workflows/rehab/open-episode";
import { progressChart as rehabProgressChart } from "#/workflows/rehab/progress-chart";
import { recordSitting as recordRehabSitting } from "#/workflows/rehab/record-sitting";
import { rescore as rescoreRehab } from "#/workflows/rehab/rescore";
import { setGoals as setRehabGoals } from "#/workflows/rehab/set-goals";
import { shareExerciseSheet as shareRehabExerciseSheet } from "#/workflows/rehab/share-exercise-sheet";
import { admit } from "#/workflows/residents/admit";
import { allocateBed } from "#/workflows/residents/allocate-bed";
import { compileStayBill } from "#/workflows/residents/compile-stay-bill";
import { familySummary as residentsFamilySummary } from "#/workflows/residents/family-summary";
import { feedback as residentsFeedback } from "#/workflows/residents/feedback";
import { getResident } from "#/workflows/residents/get-resident";
import { listResidents } from "#/workflows/residents/list-residents";
import { logDaily } from "#/workflows/residents/log-daily";
import { polypharmacyReview } from "#/workflows/residents/polypharmacy-review";
import { raiseAlert as residentsRaiseAlert } from "#/workflows/residents/raise-alert";
import { recordStayCharge } from "#/workflows/residents/record-stay-charge";
import { round as residentRound } from "#/workflows/residents/round";
import { scoreGeriatric } from "#/workflows/residents/score-geriatric";
import { sendFamilySummary as residentsSendFamilySummary } from "#/workflows/residents/send-family-summary";
import { visitLog } from "#/workflows/residents/visit-log";
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
import { attendanceMark } from "#/workflows/staff/attendance-mark";
import { createRole } from "#/workflows/staff/create-role";
import { deleteRole } from "#/workflows/staff/delete-role";
import { disableUser } from "#/workflows/staff/disable-user";
import { leaveDecide } from "#/workflows/staff/leave-decide";
import { leaveRequest } from "#/workflows/staff/leave-request";
import { listRoles } from "#/workflows/staff/list-roles";
import { payrollExport } from "#/workflows/staff/payroll-export";
import { rosterPlan } from "#/workflows/staff/roster-plan";
import { upsertStaff } from "#/workflows/staff/upsert-staff";

// Group keys mirror the clinic `src/rpc/procedures/<ns>.ts` procedure names;
// values are the ported workflow consts (aliased where file export names differ).
export const patients = {
  addAllergy,
  approveMerge,
  archiveConsent,
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

export const appointments = {
  book: bookAppointment,
  bookVideo,
  callNext,
  cancel: cancelAppointment,
  captureConsent,
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

export const admin = {
  createBranch,
  deleteRecallRule,
  deleteTemplate,
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

export const allopathy = {
  checkInteraction,
  listSoap,
  logChronic,
  problemList,
  problemUpsert,
  recordImmunization,
  registerEntry,
  saveExam,
  saveSoap,
  triageEntry,
} as const;

export const dental = {
  bookChair,
  buildPlan,
  chart,
  closeStage,
  consent,
  implantMilestone,
  pendingJobs,
  quote,
  raiseLabJob,
  rescheduleStage,
  sellPackage: sellDentalPackage,
  trackLabJob,
} as const;

export const ayush = {
  bookNadi,
  createYogaBatch,
  dualCode,
  enrollYoga,
  issueDiet,
  listFollowUpGrid,
  markYogaAttendance,
  pauseExtendPackage,
  prescribe: prescribeAyush,
  recordPackageOutcome,
  recordSitting: recordAyushSitting,
  repertorize,
  saveCaseSheet,
  saveFollowUpGrid,
  scheduleTherapy,
  sellPackage,
} as const;

export const rehab = {
  assess: assessRehab,
  bookSitting: bookRehabSitting,
  buildPackage: buildRehabPackage,
  dayBoard: rehabDayBoard,
  discharge: dischargeRehab,
  exerciseSheet,
  openEpisode,
  progressChart: rehabProgressChart,
  recordSitting: recordRehabSitting,
  rescore: rescoreRehab,
  setGoals: setRehabGoals,
  shareExerciseSheet: shareRehabExerciseSheet,
} as const;

export const psych = {
  alertSenior,
  assess: assessPsych,
  bookCounselling,
  bookTele,
  caregiverConsent,
  chartWithdrawal,
  closeReadiness: closePsychReadiness,
  involuntaryHook,
  prescribeControlled,
  recallList: psychRecallList,
  relapsePlan,
  saveSafetyPlan,
  scoreScale,
  screenRisk,
  sideEffectCheck,
} as const;

export const residents = {
  admit,
  allocateBed,
  compileStayBill,
  familySummary: residentsFamilySummary,
  feedback: residentsFeedback,
  getResident,
  listResidents,
  logDaily,
  polypharmacyReview,
  raiseAlert: residentsRaiseAlert,
  recordStayCharge,
  round: residentRound,
  scoreGeriatric,
  sendFamilySummary: residentsSendFamilySummary,
  visitLog,
} as const;

export const pharmacy = {
  batchReceive,
  cndnIssue: issuePharmacyCndn,
  expiryAlerts,
  getSale,
  grnVerify,
  itemUpsert,
  partialClose,
  piBook,
  poCreate,
  reorderSuggest,
  returnAgainstBill,
  saleFromRx,
  stockCorrect,
  stockLedger,
  transfer,
  transferAccept,
} as const;

export const diagnostics = {
  addonTest,
  authorize: authorizeDiagnostics,
  cancelOrder: cancelDiagnosticsOrder,
  collectSample,
  criticalAck,
  deliver: deliverDiagnostics,
  getOrder: getDiagnosticsOrder,
  orderLabs,
  panelCreate,
  processingStart,
  qcLog,
  queue: diagnosticsQueue,
  radioAuthorize,
  radioBook,
  radioCheckin,
  radioReportAttach,
  radioReschedule,
  receiveSample,
  resultEnter,
  sampleReject,
  tatReport,
  testMasterUpsert,
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
  pricelistUpsert,
  repriceOnPayerSwitch,
  settle,
  settleAdvance,
} as const;

export const nursing = {
  board: nursingBoard,
  checklistRecord,
  drugAdminister,
  handoverCompile,
  handoverSign,
  ioChart,
  missedEscalate,
  painScore,
  recordNote: recordNursingNote,
  riskScreen,
  sittingsSupport,
  tasksFromOrders,
  triageTag,
  vitalsChart,
} as const;

export const records = {
  addendumAppend,
  consentsGet,
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
  recordConsent,
  registersAppend,
  registersExport,
  registersVoid,
  retentionCheck,
  search: searchRecords,
  sharePrint,
  shareWhatsapp,
  timeline: recordsTimeline,
} as const;

export const operations = {
  auditQuery,
  branchesCreate,
  branchesGet,
  branchesList,
  complianceEvidence,
  complianceList,
  explorerExportCsv,
  explorerGrant,
  explorerQuery,
  mastersGet,
  mastersUpsert,
  messagingOptOut,
  messagingRetry,
  messagingSend,
  reportsDefine,
  reportsGet,
  reportsList,
  reportsRun,
  seedPresets,
} as const;

export const staff = {
  attendanceMark,
  createRole,
  deleteRole,
  disableUser,
  leaveDecide,
  leaveRequest,
  listRoles,
  payrollExport,
  rosterPlan,
  upsertStaff,
} as const;
