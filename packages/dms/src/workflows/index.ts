import { getActivity } from "./activity/get";
import { getClassActivity } from "./activity/get-class";
import { getFileActivity } from "./activity/get-file";
import { archiveClass } from "./class/archive";
import { createClass } from "./class/create";
import { addClassField } from "./class/field/add";
import { deactivateClassField } from "./class/field/deactivate";
import { updateClassField } from "./class/field/update";
import { getClass } from "./class/get";
import { listClasses } from "./class/list";
import { updateClass } from "./class/update";
import { createContact } from "./contact/create";
import { getContact, listContacts } from "./contact/list";
import { removeContact } from "./contact/remove";
import { updateContact } from "./contact/update";
import { applyFileView } from "./file-view/apply";
import { createFileView } from "./file-view/create";
import { setDefaultFileView } from "./file-view/default/set";
import { deleteFileView } from "./file-view/delete";
import { getDefaultFileView, listFileViews, listFileViewsByOwner } from "./file-view/list";
import { updateFileView } from "./file-view/update";
import { uploadBulkFiles } from "./file/bulk/upload";
import { classifyFile } from "./file/classify";
import { copyFile } from "./file/copy";
import { deleteFile } from "./file/delete";
import { downloadFile } from "./file/download";
import { getFileDownloadLink } from "./file/download-link/get";
import { getFile, getFileById } from "./file/get";
import { addFileMetadata } from "./file/metadata/add";
import { removeFileMetadata } from "./file/metadata/remove";
import { moveFile } from "./file/move";
import { purgeFile } from "./file/purge";
import { renameFile } from "./file/rename";
import { restoreFile } from "./file/restore";
import { updateFile } from "./file/update";
import { uploadFile } from "./file/upload";
import { getFolderById } from "./folder/by-id/get";
import { createFolder } from "./folder/create";
import { deleteFolder } from "./folder/delete";
import { getFolder } from "./folder/get";
import { listFolders } from "./folder/list";
import { moveFolder } from "./folder/move";
import { renameFolder } from "./folder/rename";
import { restoreFolder } from "./folder/restore";
import { updateFolder } from "./folder/update";
import { listHolds } from "./hold/list";
import { placeLegalHold } from "./hold/place";
import { releaseLegalHold } from "./hold/release";
import { applyLabel } from "./label/apply";
import { listEntitiesByLabel } from "./label/by-label/list";
import { createLabel } from "./label/create";
import { deleteLabel } from "./label/delete";
import { listLabels } from "./label/list";
import { removeLabel } from "./label/remove";
import { updateLabel } from "./label/update";
import { pinItem } from "./pin/create";
import { unpinItem } from "./pin/delete";
import { listPins } from "./pin/list";
import { createPublicLink } from "./public-link/create";
import { getPublicLinkById } from "./public-link/get";
import { listPublicLinks } from "./public-link/list";
import { resolvePublicLink } from "./public-link/resolve";
import { revokePublicLink } from "./public-link/revoke";
import { updatePublicLink } from "./public-link/update";
import { searchFilesWorkflow } from "./search/full-text";
import { promoteSearchToView } from "./search/promote-to-view";
import { quickSearchWorkflow } from "./search/quick";
import { access, archive, paths, storage } from "./services";
import { getSettingWorkflow } from "./settings/get";
import { setSettingWorkflow } from "./settings/set";
import { createShare } from "./share/create";
import { getShareById } from "./share/get";
import { listShares, listSharesByGrantee } from "./share/list";
import { removeShare } from "./share/remove";
import { resolveShareToken } from "./share/resolve";
import { listSharedWithMe } from "./share/shared-with-me/list";
import { updateShare } from "./share/update";
import { deletePermanently } from "./trash/delete-permanently";
import { emptyTrash } from "./trash/empty";
import { purgeExpiredTrash } from "./trash/expired/purge";
import { listTrash } from "./trash/list";
import { restoreFromTrash } from "./trash/restore";
import { getTriageDetail } from "./triage/detail/get";
import { listTriage } from "./triage/list";
import { deleteFileVersion } from "./version/delete";
import { getFileVersion } from "./version/get";
import { getCurrentVersion, listFileVersions } from "./version/list";
import { newFileVersion } from "./version/new";
import { revertToVersion } from "./version/revert";

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
