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
