import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  dashboard: ["create", "read", "update", "delete", "duplicate", "export", "import"],
  draft: [
    "create",
    "read",
    "update",
    "delete",
    "trash",
    "restore",
    "publish",
    "submit",
    "approve",
    "reject",
    "reopen",
    "duplicate",
    "comment",
  ],
  draftComment: ["create", "read", "delete"],
  pin: ["create", "read", "delete"],
  recent: ["read", "touch"],
  schedule: ["create", "read", "update", "delete", "pause", "resume", "mark_run"],
  search: ["read"],
  setting: ["read", "update"],
  watch: ["create", "read", "delete"],
  widget: ["create", "read", "update", "delete", "refresh"],
});
