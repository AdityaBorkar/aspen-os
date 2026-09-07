import { note } from "#/db-schemas/note";

export { notesAccessEnum, notesNoteTypeEnum } from "#/db-schemas/enums";
export { note } from "#/db-schemas/note";

export const control_plane_schemas = {} as const;

export const tenant_schemas = {
  note,
} as const;
