import { getActivity, getClassActivity, getDocumentActivity } from "./activity";
import { deleteDocumentPermanentlyWorkflow } from "./bin.delete-permanently";
import { emptyBin } from "./bin.empty";
import { listBin } from "./bin.list";
import { restoreDocument } from "./bin.restore";
import { addClassField } from "./class.add-field";
import { archiveDocumentClass } from "./class.archive";
import { createDocumentClass } from "./class.create";
import { deactivateClassField } from "./class.deactivate-field";
import { getDocumentClass } from "./class.get";
import { listClasses } from "./class.list";
import { updateDocumentClass } from "./class.update";
import { updateClassField } from "./class.update-field";
import { createContact } from "./contact.create";
import { getContact, listContacts } from "./contact.list";
import { removeContact } from "./contact.remove";
import { updateContact } from "./contact.update";
import { deleteDocument } from "./document.delete";
import { downloadDocument } from "./document.download";
import { getDocument } from "./document.get";
import {
  addDocumentMetadata,
  removeDocumentMetadata,
  tagDocument,
  untagDocument,
} from "./document.tags";
import { updateDocument } from "./document.update";
import { uploadDocument } from "./document.upload";
import { uploadBulkDocuments } from "./document.upload-bulk";
import { placeLegalHold, releaseLegalHold } from "./hold";
import { listHolds } from "./hold.list";
import { listPins, pinItem, unpinItem } from "./pin.create";
import {
  promoteSearchToView,
  quickSearchWorkflow,
  searchDocumentsWorkflow,
} from "./search";
import { getSettingWorkflow, setSettingWorkflow } from "./settings";
import { createShare } from "./share.create";
import { listShares, listSharesByGrantee } from "./share.list";
import { resolveShareToken } from "./share.resolve";
import { removeShare, updateShare } from "./share.update";
import { classifyDocument } from "./triage.classify";
import { getTriageDetail } from "./triage.detail";
import { listTriage } from "./triage.list";
import { deleteDocumentVersion } from "./version.delete";
import { getDocumentVersion } from "./version.get";
import { getCurrentVersion, listDocumentVersions } from "./version.list";
import { newDocumentVersion } from "./version.new";
import { revertToVersion } from "./version.revert";
import { applyView } from "./view.apply";
import { createView } from "./view.create";
import { deleteView } from "./view.delete";
import { getDefaultView, listViews, listViewsByOwner } from "./view.list";
import { pinView, unpinView } from "./view.pin";
import { setDefaultView } from "./view.set-default";
import { updateView } from "./view.update";

export const activity = {
  get: getActivity,
  getClass: getClassActivity,
  getDocument: getDocumentActivity,
} as const;

export const bin = {
  deletePermanently: deleteDocumentPermanentlyWorkflow,
  empty: emptyBin,
  list: listBin,
  restore: restoreDocument,
} as const;

export const classes = {
  addField: addClassField,
  archive: archiveDocumentClass,
  create: createDocumentClass,
  deactivateField: deactivateClassField,
  get: getDocumentClass,
  list: listClasses,
  update: updateDocumentClass,
  updateField: updateClassField,
} as const;

export const contacts = {
  create: createContact,
  get: getContact,
  list: listContacts,
  remove: removeContact,
  update: updateContact,
} as const;

export const documents = {
  addMetadata: addDocumentMetadata,
  delete: deleteDocument,
  download: downloadDocument,
  get: getDocument,
  removeMetadata: removeDocumentMetadata,
  tag: tagDocument,
  untag: untagDocument,
  update: updateDocument,
  upload: uploadDocument,
  uploadBulk: uploadBulkDocuments,
} as const;

export const holds = {
  list: listHolds,
  place: placeLegalHold,
  release: releaseLegalHold,
} as const;

export const pins = {
  create: pinItem,
  delete: unpinItem,
  list: listPins,
} as const;

export const search = {
  promoteToView: promoteSearchToView,
  quick: quickSearchWorkflow,
  search: searchDocumentsWorkflow,
} as const;

export const settings = {
  get: getSettingWorkflow,
  set: setSettingWorkflow,
} as const;

export const shares = {
  create: createShare,
  list: listShares,
  listByGrantee: listSharesByGrantee,
  remove: removeShare,
  resolveToken: resolveShareToken,
  update: updateShare,
} as const;

export const triage = {
  classify: classifyDocument,
  detail: getTriageDetail,
  list: listTriage,
} as const;

export const versions = {
  delete: deleteDocumentVersion,
  get: getDocumentVersion,
  getCurrent: getCurrentVersion,
  list: listDocumentVersions,
  new: newDocumentVersion,
  revert: revertToVersion,
} as const;

export const views = {
  apply: applyView,
  create: createView,
  delete: deleteView,
  getDefault: getDefaultView,
  list: listViews,
  listByOwner: listViewsByOwner,
  pin: pinView,
  setDefault: setDefaultView,
  unpin: unpinView,
  update: updateView,
} as const;
