import { NOTES_ACCESS } from "#/utils/constants";

import { NOTE_TYPE } from "@aspen-os/constants";
import { pgEnum } from "drizzle-orm/pg-core";

export const notesAccessEnum = pgEnum("notes_access", [NOTES_ACCESS.PERSONAL, NOTES_ACCESS.GLOBAL]);

export const notesNoteTypeEnum = pgEnum("notes_note_type", [
  NOTE_TYPE.GENERAL,
  NOTE_TYPE.CALL,
  NOTE_TYPE.EMAIL,
  NOTE_TYPE.MEETING,
  NOTE_TYPE.CONTRACT_RENEWAL,
  NOTE_TYPE.ISSUE,
]);
