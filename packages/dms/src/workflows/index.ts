import { getActivity } from "#/workflows/activity/get";
import { getClassActivity } from "#/workflows/activity/get-class";
import { getFileActivity } from "#/workflows/activity/get-file";
import { archiveClass } from "#/workflows/class/archive";
import { createClass } from "#/workflows/class/create";
import { addClassField } from "#/workflows/class/field/add";
import { deactivateClassField } from "#/workflows/class/field/deactivate";
import { updateClassField } from "#/workflows/class/field/update";
import { getClass } from "#/workflows/class/get";
import { listClasses } from "#/workflows/class/list";
import { updateClass } from "#/workflows/class/update";
import { createContact } from "#/workflows/contact/create";
import { getContact, listContacts } from "#/workflows/contact/list";
import { removeContact } from "#/workflows/contact/remove";
import { updateContact } from "#/workflows/contact/update";
import { applyFileView } from "#/workflows/file-view/apply";
import { createFileView } from "#/workflows/file-view/create";
import { setDefaultFileView } from "#/workflows/file-view/default/set";
import { deleteFileView } from "#/workflows/file-view/delete";
import {
  getDefaultFileView,
  listFileViews,
  listFileViewsByOwner,
} from "#/workflows/file-view/list";
import { updateFileView } from "#/workflows/file-view/update";
import { uploadBulkFiles } from "#/workflows/file/bulk/upload";
import { classifyFile } from "#/workflows/file/classify";
import { copyFile } from "#/workflows/file/copy";
import { deleteFile } from "#/workflows/file/delete";
import { downloadFile } from "#/workflows/file/download";
import { getFileDownloadLink } from "#/workflows/file/download-link/get";
import { getFile, getFileById } from "#/workflows/file/get";
import { addFileMetadata } from "#/workflows/file/metadata/add";
import { removeFileMetadata } from "#/workflows/file/metadata/remove";
import { moveFile } from "#/workflows/file/move";
import { purgeFile } from "#/workflows/file/purge";
import { renameFile } from "#/workflows/file/rename";
import { restoreFile } from "#/workflows/file/restore";
import { updateFile } from "#/workflows/file/update";
import { uploadFile } from "#/workflows/file/upload";
import { getFolderById } from "#/workflows/folder/by-id/get";
import { createFolder } from "#/workflows/folder/create";
import { deleteFolder } from "#/workflows/folder/delete";
import { getFolder } from "#/workflows/folder/get";
import { listFolders } from "#/workflows/folder/list";
import { moveFolder } from "#/workflows/folder/move";
import { renameFolder } from "#/workflows/folder/rename";
import { restoreFolder } from "#/workflows/folder/restore";
import { updateFolder } from "#/workflows/folder/update";
import { listHolds } from "#/workflows/hold/list";
import { placeLegalHold } from "#/workflows/hold/place";
import { releaseLegalHold } from "#/workflows/hold/release";
import { applyLabel } from "#/workflows/label/apply";
import { listEntitiesByLabel } from "#/workflows/label/by-label/list";
import { createLabel } from "#/workflows/label/create";
import { deleteLabel } from "#/workflows/label/delete";
import { listLabels } from "#/workflows/label/list";
import { removeLabel } from "#/workflows/label/remove";
import { updateLabel } from "#/workflows/label/update";
import { pinItem } from "#/workflows/pin/create";
import { unpinItem } from "#/workflows/pin/delete";
import { listPins } from "#/workflows/pin/list";
import { createPublicLink } from "#/workflows/public-link/create";
import { getPublicLinkById } from "#/workflows/public-link/get";
import { listPublicLinks } from "#/workflows/public-link/list";
import { resolvePublicLink } from "#/workflows/public-link/resolve";
import { revokePublicLink } from "#/workflows/public-link/revoke";
import { updatePublicLink } from "#/workflows/public-link/update";
import { searchFilesWorkflow } from "#/workflows/search/full-text";
import { promoteSearchToView } from "#/workflows/search/promote-to-view";
import { quickSearchWorkflow } from "#/workflows/search/quick";
import { access, archive, paths, storage } from "#/workflows/services";
import { getSettingWorkflow } from "#/workflows/settings/get";
import { setSettingWorkflow } from "#/workflows/settings/set";
import { createShare } from "#/workflows/share/create";
import { getShareById } from "#/workflows/share/get";
import { listShares, listSharesByGrantee } from "#/workflows/share/list";
import { removeShare } from "#/workflows/share/remove";
import { resolveShareToken } from "#/workflows/share/resolve";
import { listSharedWithMe } from "#/workflows/share/shared-with-me/list";
import { updateShare } from "#/workflows/share/update";
import { deletePermanently } from "#/workflows/trash/delete-permanently";
import { emptyTrash } from "#/workflows/trash/empty";
import { purgeExpiredTrash } from "#/workflows/trash/expired/purge";
import { listTrash } from "#/workflows/trash/list";
import { restoreFromTrash } from "#/workflows/trash/restore";
import { getTriageDetail } from "#/workflows/triage/detail/get";
import { listTriage } from "#/workflows/triage/list";
import { deleteFileVersion } from "#/workflows/version/delete";
import { getFileVersion } from "#/workflows/version/get";
import { getCurrentVersion, listFileVersions } from "#/workflows/version/list";
import { newFileVersion } from "#/workflows/version/new";
import { revertToVersion } from "#/workflows/version/revert";

export const activity = {
  get: getActivity,
  getClass: getClassActivity,
  getFile: getFileActivity,
} as const;

export const classes = {
  addField: addClassField,
  archive: archiveClass,
  create: createClass,
  deactivateField: deactivateClassField,
  get: getClass,
  list: listClasses,
  update: updateClass,
  updateField: updateClassField,
} as const;

export const contacts = {
  create: createContact,
  get: getContact,
  list: listContacts,
  remove: removeContact,
  update: updateContact,
} as const;

export const fileViews = {
  apply: applyFileView,
  create: createFileView,
  delete: deleteFileView,
  getDefault: getDefaultFileView,
  list: listFileViews,
  listByOwner: listFileViewsByOwner,
  setDefault: setDefaultFileView,
  update: updateFileView,
} as const;

export const files = {
  addMetadata: addFileMetadata,
  classify: classifyFile,
  copy: copyFile,
  delete: deleteFile,
  deleteVersion: deleteFileVersion,
  download: downloadFile,
  get: getFile,
  getById: getFileById,
  getDownloadLink: getFileDownloadLink,
  listVersions: listFileVersions,
  move: moveFile,
  newVersion: newFileVersion,
  purge: purgeFile,
  removeMetadata: removeFileMetadata,
  rename: renameFile,
  restore: restoreFile,
  revert: revertToVersion,
  update: updateFile,
  upload: uploadFile,
  uploadBulk: uploadBulkFiles,
} as const;

export const folders = {
  create: createFolder,
  delete: deleteFolder,
  get: getFolder,
  getById: getFolderById,
  list: listFolders,
  move: moveFolder,
  rename: renameFolder,
  restore: restoreFolder,
  update: updateFolder,
} as const;

export const holds = {
  list: listHolds,
  place: placeLegalHold,
  release: releaseLegalHold,
} as const;

export const labels = {
  apply: applyLabel,
  create: createLabel,
  delete: deleteLabel,
  list: listLabels,
  listByLabel: listEntitiesByLabel,
  remove: removeLabel,
  update: updateLabel,
} as const;

export const pins = {
  create: pinItem,
  delete: unpinItem,
  list: listPins,
} as const;

export const search = {
  promoteToView: promoteSearchToView,
  quick: quickSearchWorkflow,
  search: searchFilesWorkflow,
} as const;

export const settings = {
  get: getSettingWorkflow,
  set: setSettingWorkflow,
} as const;

export const shares = {
  create: createShare,
  createPublicLink,
  get: getShareById,
  getPublicLink: getPublicLinkById,
  list: listShares,
  listByGrantee: listSharesByGrantee,
  listPublicLinks,
  listSharedWithMe,
  remove: removeShare,
  resolvePublicLink,
  resolveToken: resolveShareToken,
  revokePublicLink,
  update: updateShare,
  updatePublicLink,
} as const;

export const trash = {
  deletePermanently,
  empty: emptyTrash,
  list: listTrash,
  purgeExpired: purgeExpiredTrash,
  restore: restoreFromTrash,
} as const;

export const triage = {
  classify: classifyFile,
  detail: getTriageDetail,
  list: listTriage,
} as const;

export const versions = {
  delete: deleteFileVersion,
  get: getFileVersion,
  getCurrent: getCurrentVersion,
  list: listFileVersions,
  new: newFileVersion,
  revert: revertToVersion,
} as const;

export { access, archive, paths, storage };
