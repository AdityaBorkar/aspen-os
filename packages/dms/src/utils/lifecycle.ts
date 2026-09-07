/**
 * Lifecycle predicates for DMS entities. These encode the literal status
 * checks previously inlined across share/hold/trash workflows so the rules
 * live in one place.
 */

export function isSharableFile(status: string): boolean {
  return status === "active";
}

export function isSharableFolder(isTrashed: boolean): boolean {
  return !isTrashed;
}

export function isPurgeableFile(status: string): boolean {
  return status === "trashed" || status === "expired";
}

export function isPurgeableFolder(isTrashed: boolean): boolean {
  return isTrashed;
}

export function isHoldable(status: string): boolean {
  return status !== "trashed" && status !== "triaged";
}
