export interface DocumentBundleResource {
  id: string;
  resourceType: string;
}

export interface DocumentBundleInput {
  composition: DocumentBundleResource;
  entries: DocumentBundleResource[];
}

export interface DocumentBundleEntry {
  resource: DocumentBundleResource;
}

export interface FhirDocumentBundle {
  entry: DocumentBundleEntry[];
  resourceType: "Bundle";
  timestamp: string;
  type: "document";
}

export function wrapDocumentBundle(
  input: DocumentBundleInput,
  timestamp: string,
): FhirDocumentBundle {
  return {
    entry: [{ resource: input.composition }, ...input.entries.map((resource) => ({ resource }))],
    resourceType: "Bundle",
    timestamp,
    type: "document",
  };
}
