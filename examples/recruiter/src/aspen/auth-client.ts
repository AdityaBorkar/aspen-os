// // Client-side access control definition for type inference and client-side validation.
// // This mirrors the server-side module ACL declarations.
// export const access_control = createAccessControl({
//   audit_logs: ["read"],
//   client_contracts: ["create", "read", "update", "archive"],
//   clients: ["create", "read", "update", "archive"],
//   drafts: ["create", "read", "update", "delete"],
//   filter_views: ["create", "read", "update", "delete"],
//   job_mandates: [
//     "create",
//     "read",
//     "update",
//     "archive",
//     "assign",
//     "link_prospect",
//     "verify",
//   ],
//   notification: ["read", "update", "archive"],
//   prospects: ["create", "read", "update", "archive"],
//   reminders: ["create", "read", "archive"],
//   tasks: ["create", "read", "update", "archive", "assign"],
//   team_members: ["create", "read", "update", "archive", "manage-roles"],
// });
