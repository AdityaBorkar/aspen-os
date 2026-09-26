import { announcement, announcementRecipient } from "#/db-schemas/announcement";
import { announcementPriorityEnum, announcementStatusEnum } from "#/db-schemas/enums";

export { announcement, announcementRecipient } from "#/db-schemas/announcement";
export * from "#/db-schemas/enums";

export const dbSchema = {
  announcement,
  announcementRecipient,
} as const;

export const control_plane_schemas = {} as const;

// drizzle-kit's push only creates enum types listed as top-level values of
// the schema map, so the co-located enums are included alongside the tables.
export const tenant_schemas = {
  announcement,
  announcementPriorityEnum,
  announcementRecipient,
  announcementStatusEnum,
} as const;
