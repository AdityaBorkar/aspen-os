export const DMS_FILE_OWNERSHIP = "dms.file" as const;

export const DMS_VERSION_OWNERSHIP = "dms.version" as const;

export const DMS_SHARE_OWNERSHIP = "dms.share" as const;

export const DMS_HOLD_OWNERSHIP = "dms.hold" as const;

export const DMS_PUBLIC_LINK_OWNERSHIP = "dms.public-link" as const;

export interface ClinicalFileReference {
  dmsFileId: string | null;
  legacyPath: string;
}

export function clinicalFileReference(
  dmsFileId: string | null | undefined,
  legacyPath: string,
): ClinicalFileReference {
  return { dmsFileId: dmsFileId ?? null, legacyPath };
}

export function preferredFileReference(ref: ClinicalFileReference): string {
  return ref.dmsFileId ?? ref.legacyPath;
}

export function hasDmsFile(ref: ClinicalFileReference): boolean {
  return ref.dmsFileId !== null && ref.dmsFileId.length > 0;
}
