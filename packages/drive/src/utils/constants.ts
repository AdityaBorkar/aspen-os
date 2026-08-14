export const DRIVE_ITEM_TYPE = {
  FILE: "file",
  FOLDER: "folder",
} as const;

export type DriveItemType = (typeof DRIVE_ITEM_TYPE)[keyof typeof DRIVE_ITEM_TYPE];

export const DRIVE_GRANTEE_TYPE = {
  GROUP: "group",
  USER: "user",
} as const;

export type DriveGranteeType = (typeof DRIVE_GRANTEE_TYPE)[keyof typeof DRIVE_GRANTEE_TYPE];

export const DRIVE_PERMISSION = {
  EDITOR: "editor",
  OWNER: "owner",
  VIEWER: "viewer",
} as const;

export type DrivePermission = (typeof DRIVE_PERMISSION)[keyof typeof DRIVE_PERMISSION];

export const DRIVE_PUBLIC_LINK_PERMISSION = {
  EDIT: "edit",
  VIEW: "view",
} as const;

export type DrivePublicLinkPermission =
  (typeof DRIVE_PUBLIC_LINK_PERMISSION)[keyof typeof DRIVE_PUBLIC_LINK_PERMISSION];
