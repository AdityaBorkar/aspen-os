export const NOTE_TYPE = {
  CALL: "call",
  CONTRACT_RENEWAL: "contract_renewal",
  EMAIL: "email",
  GENERAL: "general",
  ISSUE: "issue",
  MEETING: "meeting",
} as const;

export type NoteType = (typeof NOTE_TYPE)[keyof typeof NOTE_TYPE];
