import { createNote } from "#/workflows/note/create";
import { deleteNote } from "#/workflows/note/delete";
import { getNote } from "#/workflows/note/get";
import { listNotes } from "#/workflows/note/list";
import { updateNote } from "#/workflows/note/update";

export const notes = {
  create: createNote,
  delete: deleteNote,
  get: getNote,
  list: listNotes,
  update: updateNote,
} as const;
