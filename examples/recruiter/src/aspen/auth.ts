import { createAccessControl } from "@aspen-os/platform/client";

export const access_control = createAccessControl({
  audit_logs: ["read"],
  client_contracts: ["create", "read", "update", "archive"],
  clients: ["create", "read", "update", "archive"],
  drafts: ["create", "read", "update", "delete"],
  filter_views: ["create", "read", "update", "delete"],
  job_mandates: [
    "create",
    "read",
    "update",
    "archive",
    "assign",
    "link_prospect",
    "verify",
  ],
  notification: ["read", "update", "archive"],
  prospects: ["create", "read", "update", "archive"],
  reminders: ["create", "read", "archive"],
  tasks: ["create", "read", "update", "archive", "assign"],
  team_members: ["create", "read", "update", "archive", "manage-roles"],
});

export const roles = {
  admin: access_control.newRole({
    audit_logs: ["read"],
    client_contracts: ["create", "read", "update", "archive"],
    clients: ["create", "read", "update", "archive"],
    drafts: ["create", "read", "update", "delete"],
    filter_views: ["create", "read", "update", "delete"],
    job_mandates: [
      "create",
      "read",
      "update",
      "archive",
      "assign",
      "link_prospect",
      "verify",
    ],
    notification: ["read", "update", "archive"],
    prospects: ["create", "read", "update", "archive"],
    reminders: ["create", "read", "archive"],
    tasks: ["create", "read", "update", "archive", "assign"],
    team_members: ["create", "read", "update", "archive", "manage-roles"],
  }),
  bd: access_control.newRole({
    client_contracts: ["create", "read", "update", "archive"],
    clients: ["create", "read", "update", "archive"],
    drafts: ["create", "read", "update", "delete"],
    filter_views: ["create", "read", "update", "delete"],
    job_mandates: ["create", "read", "update", "archive", "assign"],
    notification: ["read", "update", "archive"],
    prospects: ["create", "read"],
    reminders: ["create", "read", "archive"],
    tasks: ["create", "read", "update", "archive", "assign"],
    team_members: ["read"],
  }),
  caller: access_control.newRole({
    drafts: ["create", "read", "update", "delete"],
    filter_views: ["create", "read", "update", "delete"],
    job_mandates: ["read"],
    notification: ["read", "update", "archive"],
    prospects: ["create", "read", "update"],
    reminders: ["create", "read", "archive"],
    tasks: ["create", "read", "update", "archive", "assign"],
    team_members: ["read"],
  }),
  qc: access_control.newRole({
    drafts: ["create", "read", "update", "delete"],
    filter_views: ["create", "read", "update", "delete"],
    job_mandates: ["read", "verify"],
    notification: ["read", "update", "archive"],
    prospects: ["read"],
    reminders: ["create", "read", "archive"],
    tasks: ["create", "read", "update", "archive", "assign"],
    team_members: ["read"],
  }),
  rm: access_control.newRole({
    client_contracts: ["read"],
    clients: ["read"],
    drafts: ["create", "read", "update", "delete"],
    filter_views: ["create", "read", "update", "delete"],
    job_mandates: ["read", "assign"],
    notification: ["read", "update", "archive"],
    prospects: ["create", "read"],
    reminders: ["create", "read", "archive"],
    tasks: ["create", "read", "update", "archive", "assign"],
    team_members: ["read"],
  }),
  sc: access_control.newRole({
    drafts: ["create", "read", "update", "delete"],
    filter_views: ["create", "read", "update", "delete"],
    job_mandates: ["read", "link_prospect"],
    notification: ["read", "update", "archive"],
    prospects: ["create", "read", "update", "archive"],
    reminders: ["create", "read", "archive"],
    tasks: ["create", "read", "update", "archive", "assign"],
    team_members: ["read"],
  }),
  tl: access_control.newRole({
    drafts: ["create", "read", "update", "delete"],
    filter_views: ["create", "read", "update", "delete"],
    job_mandates: ["read", "assign", "link_prospect"],
    notification: ["read", "update", "archive"],
    prospects: ["create", "read"],
    reminders: ["create", "read", "archive"],
    tasks: ["create", "read", "update", "archive", "assign"],
    team_members: ["read"],
  }),
} as const;

// import { ROLE_DISPLAY_NAMES } from "../constants";
//
// export type RoleCode = keyof typeof roles | "custom";
// export type Statement = typeof ac.statements;
// export type Resource = keyof Statement;
// export type Action<S extends Resource = Resource> = Statement[S][number];
// export type PermissionSet = Record<string, string[]>;
// export type ResolvedPermissions = string[];

// export function resolvePermissions({
//   role,
//   permissions,
// }: {
//   role: RoleCode;
//   permissions?: PermissionSet | null;
// }): ResolvedPermissions {
//   if (role === "custom") {
//     if (!permissions) return [];
//     return Object.entries(permissions).flatMap(([domain, actions]) =>
//       actions.map((access) => `${domain}:${access}`),
//     );
//   }

//   if (!(role in roles)) return [];
//   const roleDef = roles[role];
//   if (!roleDef) return [];

//   return Object.entries(roleDef.statements).flatMap(([domain, actions]) =>
//     actions.map((access: string) => `${domain}:${access}`),
//   );
// }

// export function listPredefinedRoles() {
//   const result: {
//     code: RoleCode;
//     displayName: string;
//     permissions: PermissionSet;
//   }[] = [];

//   for (const [code, roleDef] of Object.entries(roles)) {
//     const permissions: PermissionSet = {};
//     for (const resource of Object.keys(ac.statements) as Resource[]) {
//       const allowed = (roleDef as unknown as Record<string, string[]>)[
//         resource
//       ];
//       if (allowed && allowed.length > 0) {
//         permissions[resource] = allowed;
//       }
//     }
//     result.push({
//       code: code as RoleCode,
//       displayName: ROLE_DISPLAY_NAMES[code as RoleCode],
//       permissions,
//     });
//   }

//   result.push({
//     code: "custom",
//     displayName: ROLE_DISPLAY_NAMES.custom,
//     permissions: {},
//   });

//   return result;
// }
