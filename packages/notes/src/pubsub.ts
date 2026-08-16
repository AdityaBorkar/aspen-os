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

export interface NoteCreatedEvent {
  note: {
    access: NotesAccess;
    body: string;
    id: string;
    scopeId: string | null;
    scopeType: string | null;
    title: string | null;
    type: NoteType;
  };
}

export interface NoteUpdatedEvent {
  changes: Record<string, JsonValue>;
  note: {
    access: NotesAccess;
    body: string;
    id: string;
    scopeId: string | null;
    scopeType: string | null;
    title: string | null;
    type: NoteType;
  };
}

export interface NoteDeletedEvent {
  note: {
    access: NotesAccess;
    body: string;
    id: string;
    scopeId: string | null;
    scopeType: string | null;
    title: string | null;
    type: NoteType;
  };
}

export interface NoteEventMap {
  [NOTE_EVENTS.CREATED]: NoteCreatedEvent;
  [NOTE_EVENTS.DELETED]: NoteDeletedEvent;
  [NOTE_EVENTS.UPDATED]: NoteUpdatedEvent;
}

export type NotesEventMap = NoteEventMap;
