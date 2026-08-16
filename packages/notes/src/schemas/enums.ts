import { NOTES_ACCESS } from "#/utils/constants";

import { NOTE_TYPE } from "@aspen-os/constants";
import { picklist } from "valibot";

export const NotesAccessSchema = picklist(Object.values(NOTES_ACCESS));

export const NoteTypeSchema = picklist(Object.values(NOTE_TYPE));

export { NOTES_ACCESS } from "#/utils/constants";
export { NOTE_TYPE } from "@aspen-os/constants";
