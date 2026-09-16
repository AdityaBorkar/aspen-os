import { announcement, announcementRecipient } from "#/db-schemas/announcement";

export { announcement, announcementRecipient } from "#/db-schemas/announcement";
export * from "#/db-schemas/enums";

export const dbSchema = {
  announcement,
  announcementRecipient,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = {
  announcement,
  announcementRecipient,
} as const;
