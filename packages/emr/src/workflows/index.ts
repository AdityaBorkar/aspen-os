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
import { bookNadi } from "#/workflows/ayush/book-nadi";
import { createYogaBatch } from "#/workflows/ayush/create-yoga-batch";
import { dualCode } from "#/workflows/ayush/dual-code";
import { enrollYoga } from "#/workflows/ayush/enroll-yoga";
import { issueDiet } from "#/workflows/ayush/issue-diet";
import { listFollowUpGrid } from "#/workflows/ayush/list-follow-up-grid";
import { markYogaAttendance } from "#/workflows/ayush/mark-yoga-attendance";
import { pauseExtendPackage } from "#/workflows/ayush/pause-extend-package";
import { prescribeAyush } from "#/workflows/ayush/prescribe";
import { recordPackageOutcome } from "#/workflows/ayush/record-package-outcome";
import { recordSitting as recordAyushSitting } from "#/workflows/ayush/record-sitting";
import { repertorize } from "#/workflows/ayush/repertorize";
import { saveCaseSheet } from "#/workflows/ayush/save-case-sheet";
import { saveFollowUpGrid } from "#/workflows/ayush/save-follow-up-grid";
import { scheduleTherapy } from "#/workflows/ayush/schedule-therapy";
import { sellPackage } from "#/workflows/ayush/sell-package";
import { bookChair } from "#/workflows/dental/book-chair";
import { buildPlan } from "#/workflows/dental/build-plan";
import { chart } from "#/workflows/dental/chart";
import { closeStage } from "#/workflows/dental/close-stage";
import { implantMilestone } from "#/workflows/dental/implant-milestone";
import { pendingJobs } from "#/workflows/dental/pending-jobs";
import { quote } from "#/workflows/dental/quote";
import { raiseLabJob } from "#/workflows/dental/raise-lab-job";
import { rescheduleStage } from "#/workflows/dental/reschedule-stage";
import { sellDentalPackage } from "#/workflows/dental/sell-package";
import { trackLabJob } from "#/workflows/dental/track-lab-job";
import { alertSenior } from "#/workflows/psych/alert-senior";
import { assess as assessPsych } from "#/workflows/psych/assess";
import { bookCounselling } from "#/workflows/psych/book-counselling";
import { bookTele } from "#/workflows/psych/book-tele";
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
