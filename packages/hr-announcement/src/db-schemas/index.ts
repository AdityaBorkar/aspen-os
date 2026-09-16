import { hrAnnouncement, hrAnnouncementRecipient } from "#/db-schemas/announcement";

export { hrAnnouncement, hrAnnouncementRecipient } from "#/db-schemas/announcement";
export * from "#/db-schemas/enums";

export const dbSchema = {
  hrAnnouncement,
  hrAnnouncementRecipient,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = {
  hrAnnouncement,
  hrAnnouncementRecipient,
} as const;
