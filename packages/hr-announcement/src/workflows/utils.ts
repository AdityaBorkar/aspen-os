export function assertUpdated<TRow>(row: TRow | undefined, label: string): TRow {
  if (!row) {
    throw new Error(`${label} not found.`);
  }
  return row;
}
