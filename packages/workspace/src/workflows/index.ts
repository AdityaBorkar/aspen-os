import { createDashboard } from "#/workflows/dashboard/create";
import { deleteDashboard } from "#/workflows/dashboard/delete";
import { duplicateDashboard } from "#/workflows/dashboard/duplicate";
import { exportDashboard } from "#/workflows/dashboard/export";
import { getDashboard } from "#/workflows/dashboard/get";
import { importDashboard } from "#/workflows/dashboard/import";
import { listDashboards } from "#/workflows/dashboard/list";
import { updateDashboard } from "#/workflows/dashboard/update";
import { addWidget } from "#/workflows/dashboard/widget/add";
import { getWidget } from "#/workflows/dashboard/widget/get";
import { listWidgets } from "#/workflows/dashboard/widget/list";
import { moveWidget } from "#/workflows/dashboard/widget/move";
import { refreshWidget } from "#/workflows/dashboard/widget/refresh";
import { removeWidget } from "#/workflows/dashboard/widget/remove";
import { updateWidget } from "#/workflows/dashboard/widget/update";
import { approveDraft } from "#/workflows/draft/approve";
import { addDraftComment } from "#/workflows/draft/comment/add";
import { listDraftComments } from "#/workflows/draft/comment/list";
import { removeDraftComment } from "#/workflows/draft/comment/remove";
import { createDraft } from "#/workflows/draft/create";
import { deleteDraft } from "#/workflows/draft/delete";
import { duplicateDraft } from "#/workflows/draft/duplicate";
import { getDraft } from "#/workflows/draft/get";
import { listDrafts } from "#/workflows/draft/list";
import { publishDraft } from "#/workflows/draft/publish";
import { rejectDraft } from "#/workflows/draft/reject";
import { reopenDraft } from "#/workflows/draft/reopen";
import { restoreDraft } from "#/workflows/draft/restore";
import { submitDraft } from "#/workflows/draft/submit";
import { trashDraft } from "#/workflows/draft/trash";
import { updateDraft } from "#/workflows/draft/update";
import { pinItem } from "#/workflows/pin/create";
import { unpinItem } from "#/workflows/pin/delete";
import { listPins } from "#/workflows/pin/list";
import { listRecent } from "#/workflows/recent/list";
import { touchRecent } from "#/workflows/recent/touch";
import { createSchedule } from "#/workflows/schedule/create";
import { deleteSchedule } from "#/workflows/schedule/delete";
import { getSchedule } from "#/workflows/schedule/get";
import { listSchedules } from "#/workflows/schedule/list";
import { markRunSchedule } from "#/workflows/schedule/mark-run";
import { pauseSchedule } from "#/workflows/schedule/pause";
import { resumeSchedule } from "#/workflows/schedule/resume";
import { updateSchedule } from "#/workflows/schedule/update";
import { quickSearch } from "#/workflows/search/quick";
import { getSetting } from "#/workflows/settings/get";
import { setSetting } from "#/workflows/settings/set";
import { applyView } from "#/workflows/view/apply";
import { createView } from "#/workflows/view/create";
import { setDefaultView } from "#/workflows/view/default/set";
import { deleteView } from "#/workflows/view/delete";
import { duplicateView } from "#/workflows/view/duplicate";
import { getView } from "#/workflows/view/get";
import { listViews } from "#/workflows/view/list";
import { updateView } from "#/workflows/view/update";
import { listWatches } from "#/workflows/watch/list";
import { subscribeWatch } from "#/workflows/watch/subscribe";
import { unsubscribeWatch } from "#/workflows/watch/unsubscribe";

export const dashboards = {
  create: createDashboard,
  delete: deleteDashboard,
  duplicate: duplicateDashboard,
  export: exportDashboard,
  get: getDashboard,
  import: importDashboard,
  list: listDashboards,
  update: updateDashboard,
} as const;

export const drafts = {
  addComment: addDraftComment,
  approve: approveDraft,
  create: createDraft,
  delete: deleteDraft,
  duplicate: duplicateDraft,
  get: getDraft,
  list: listDrafts,
  listComments: listDraftComments,
  publish: publishDraft,
  reject: rejectDraft,
  removeComment: removeDraftComment,
  reopen: reopenDraft,
  restore: restoreDraft,
  submit: submitDraft,
  trash: trashDraft,
  update: updateDraft,
} as const;

export const pins = {
  create: pinItem,
  delete: unpinItem,
  list: listPins,
} as const;

export const recent = {
  list: listRecent,
  touch: touchRecent,
} as const;

export const schedules = {
  create: createSchedule,
  delete: deleteSchedule,
  get: getSchedule,
  list: listSchedules,
  markRun: markRunSchedule,
  pause: pauseSchedule,
  resume: resumeSchedule,
  update: updateSchedule,
} as const;

export const search = {
  quick: quickSearch,
} as const;

export const settings = {
  get: getSetting,
  set: setSetting,
} as const;

export const views = {
  apply: applyView,
  create: createView,
  delete: deleteView,
  duplicate: duplicateView,
  get: getView,
  list: listViews,
  setDefault: setDefaultView,
  update: updateView,
} as const;

export const watches = {
  list: listWatches,
  subscribe: subscribeWatch,
  unsubscribe: unsubscribeWatch,
} as const;

export const widgets = {
  add: addWidget,
  get: getWidget,
  list: listWidgets,
  move: moveWidget,
  refresh: refreshWidget,
  remove: removeWidget,
  update: updateWidget,
} as const;
