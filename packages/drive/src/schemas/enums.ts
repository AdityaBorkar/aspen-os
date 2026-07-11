import { enum as enum_ } from "valibot";

export const DriveItemTypeSchema = enum_({
  file: "file",
  folder: "folder",
});

export const DriveGranteeTypeSchema = enum_({
  group: "group",
  user: "user",
});

export const DrivePermissionSchema = enum_({
  editor: "editor",
  owner: "owner",
  viewer: "viewer",
});

export const DrivePublicLinkPermissionSchema = enum_({
  edit: "edit",
  view: "view",
});

export const DriveSearchScopeSchema = enum_({
  all: "all",
  my_files: "my_files",
  shared_with_me: "shared_with_me",
});

export const DriveSortOrderSchema = enum_({
  asc: "asc",
  desc: "desc",
});
