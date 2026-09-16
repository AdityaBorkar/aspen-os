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
