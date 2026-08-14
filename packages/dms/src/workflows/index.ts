import { getActivity, getClassActivity, getFileActivity } from "./activity";
import { addClassField } from "./class.add-field";
import { archiveClass } from "./class.archive";
import { createClass } from "./class.create";
import { deactivateClassField } from "./class.deactivate-field";
import { getClass } from "./class.get";
import { listClasses } from "./class.list";
import { updateClass } from "./class.update";
import { updateClassField } from "./class.update-field";
import { createContact } from "./contact.create";
import { getContact, listContacts } from "./contact.list";
import { removeContact } from "./contact.remove";
import { updateContact } from "./contact.update";
import { applyFileView } from "./file-view.apply";
import { createFileView } from "./file-view.create";
import { deleteFileView } from "./file-view.delete";
import { getDefaultFileView, listFileViews, listFileViewsByOwner } from "./file-view.list";
import { setDefaultFileView } from "./file-view.set-default";
import { updateFileView } from "./file-view.update";
import { classifyFile } from "./file.classify";
import { copyFile } from "./file.copy";
import { deleteFile } from "./file.delete";
import { downloadFile } from "./file.download";
import { getFileDownloadLink } from "./file.download-link";
import { getFile, getFileById } from "./file.get";
import { addFileMetadata, removeFileMetadata } from "./file.metadata";
import { moveFile } from "./file.move";
import { purgeFile } from "./file.purge";
import { renameFile } from "./file.rename";
import { restoreFile } from "./file.restore";
import { updateFile } from "./file.update";
import { uploadFile } from "./file.upload";
import { uploadBulkFiles } from "./file.upload-bulk";
import { createFolder } from "./folder.create";
import { deleteFolder } from "./folder.delete";
import { getFolder } from "./folder.get";
import { getFolderById } from "./folder.get-by-id";
import { listFolders } from "./folder.list";
import { moveFolder } from "./folder.move";
import { renameFolder } from "./folder.rename";
import { restoreFolder } from "./folder.restore";
import { updateFolder } from "./folder.update";
import { placeLegalHold, releaseLegalHold } from "./hold";
import { listHolds } from "./hold.list";
import { applyLabel } from "./label.apply";
import { createLabel } from "./label.create";
import { deleteLabel } from "./label.delete";
import { listLabels } from "./label.list";
import { listEntitiesByLabel } from "./label.list-by-label";
import { removeLabel } from "./label.remove";
import { updateLabel } from "./label.update";
import { listPins, pinItem, unpinItem } from "./pin";
import { createPublicLink } from "./public-link.create";
import { getPublicLinkById } from "./public-link.get";
import { listPublicLinks } from "./public-link.list";
import { resolvePublicLink } from "./public-link.resolve";
import { revokePublicLink } from "./public-link.revoke";
import { updatePublicLink } from "./public-link.update";
import { promoteSearchToView, quickSearchWorkflow, searchFilesWorkflow } from "./search";
import { access, archive, paths, storage } from "./services";
import { getSettingWorkflow, setSettingWorkflow } from "./settings";
import { createShare } from "./share.create";
import { getShareById } from "./share.get";
import { listShares, listSharesByGrantee } from "./share.list";
import { listSharedWithMe } from "./share.list-shared-with-me";
import { resolveShareToken } from "./share.resolve";
import { removeShare, updateShare } from "./share.update";
import { deletePermanently } from "./trash.delete-permanently";
import { emptyTrash } from "./trash.empty";
import { listTrash } from "./trash.list";
import { purgeExpiredTrash } from "./trash.purge-expired";
import { restoreFromTrash } from "./trash.restore";
import { getTriageDetail } from "./triage.detail";
import { listTriage } from "./triage.list";
import { deleteFileVersion } from "./version.delete";
import { getFileVersion } from "./version.get";
import { getCurrentVersion, listFileVersions } from "./version.list";
import { newFileVersion } from "./version.new";
import { revertToVersion } from "./version.revert";

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
