import type { NotesAccess } from "#/utils/constants";

import type { NoteType } from "@aspen-os/constants";
import type { JsonValue } from "@aspen-os/platform/server";

export const NOTE_EVENTS = {
  CREATED: "notes:note_created",
  DELETED: "notes:note_deleted",
  UPDATED: "notes:note_updated",
} as const;

export const events = {
  NOTE_EVENTS,
};

export interface NoteEventNote {
  access: NotesAccess;
  body: string;
  id: string;
  metadata: Record<string, JsonValue>;
  ownerId: string;
  scopeId: string | null;
  scopeType: string | null;
  tags: string[];
  title: string | null;
  type: NoteType;
}

export interface NoteCreatedEvent {
  note: NoteEventNote;
}

export interface NoteUpdatedEvent {
  changes: Record<string, JsonValue>;
  note: NoteEventNote;
}

export interface NoteDeletedEvent {
  note: NoteEventNote;
}

export interface NoteEventMap {
  [NOTE_EVENTS.CREATED]: NoteCreatedEvent;
  [NOTE_EVENTS.DELETED]: NoteDeletedEvent;
  [NOTE_EVENTS.UPDATED]: NoteUpdatedEvent;
}

export type NotesEventMap = NoteEventMap;
