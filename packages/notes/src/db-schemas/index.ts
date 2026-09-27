import { notesAccessEnum, notesNoteTypeEnum } from "#/db-schemas/enums";
import { note } from "#/db-schemas/note";

export { notesAccessEnum, notesNoteTypeEnum } from "#/db-schemas/enums";
export { note } from "#/db-schemas/note";

export const control_plane_schemas = {} as const;

// drizzle-kit's push only creates enum types listed as top-level values of
// the schema map, so every enum used by the co-located tables is included
// (same amendment as comms/announcement).
export const tenant_schemas = {
  note,
  notesAccessEnum,
  notesNoteTypeEnum,
} as const;
