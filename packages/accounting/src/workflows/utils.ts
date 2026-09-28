export function assertUpdated<TRow>(row: TRow | undefined, label: string): TRow {
  if (!row) {
    throw new Error(`${label} not found.`);
  }
  return row;
}

export function assertDraft(status: string, label: string): void {
  if (status !== "draft") {
    throw new Error(`Only draft ${label} can be modified.`);
  }
}

export function assertSubmitted(status: string, label: string): void {
  if (status !== "submitted" && status !== "unpaid" && status !== "partly_paid") {
    throw new Error(`Only submitted ${label} can transition.`);
  }
}
