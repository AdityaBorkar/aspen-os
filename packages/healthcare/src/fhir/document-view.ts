import type { HealthcareClinicalDocument } from "#/db-schemas/records";

import { boolean, is, object, optional } from "valibot";
import type { InferOutput } from "valibot";

import type { FhirExtensionInput } from "./fhir-extension";
import { DOC_STATUS_MAP, DOCREF_STATUS_MAP } from "./registries";
import type { DocStatusCanonical, DocrefStatusCanonical } from "./registries";

export interface FhirDocumentFile {
  contentType: string | null;
  created: string;
  id: string;
  url: string;
}

export interface FhirDocumentAttachment {
  contentType: string | null;
  creation: string;
  title: string | null;
  url: string;
}

export interface FhirDocumentReferenceView {
  author: string[];
  category: string;
  content: FhirDocumentAttachment[];
  date: string;
  docStatus: DocStatusCanonical;
  encounter: string | null;
  extension: FhirExtensionInput[];
  id: string;
  identifier: string;
  resourceType: "DocumentReference";
  status: DocrefStatusCanonical;
  subject: string;
  type: string;
  verifier: string | null;
}

const DocumentFhirOverlaySchema = object({
  superseded: optional(boolean()),
});

type DocumentFhirOverlay = InferOutput<typeof DocumentFhirOverlaySchema>;

function readOverlay(payload: HealthcareClinicalDocument["payload"]): DocumentFhirOverlay | null {
  if (payload === null || payload === undefined) {
    return null;
  }
  const raw = payload.fhir;
  if (raw instanceof Date || Array.isArray(raw)) {
    return null;
  }
  return is(DocumentFhirOverlaySchema, raw) ? raw : null;
}

function mapDocStatus(docStatus: string | null, verified: boolean): DocStatusCanonical {
  if (docStatus !== null) {
    const normalized = docStatus.trim().toLowerCase();
    if (
      normalized === "final" ||
      normalized === "issued" ||
      normalized === "published" ||
      normalized === "signed"
    ) {
      return DOC_STATUS_MAP.FINAL;
    }
    if (normalized === "amended") {
      return DOC_STATUS_MAP.AMENDED;
    }
    return DOC_STATUS_MAP.PRELIMINARY;
  }
  return verified ? DOC_STATUS_MAP.FINAL : DOC_STATUS_MAP.PRELIMINARY;
}

function mapDocrefStatus(
  docStatus: string | null,
  overlay: DocumentFhirOverlay | null,
): DocrefStatusCanonical {
  if (overlay?.superseded === true) {
    return DOCREF_STATUS_MAP.SUPERSEDED;
  }
  if (docStatus !== null) {
    const normalized = docStatus.trim().toLowerCase();
    if (normalized === "void" || normalized === "superseded") {
      return DOCREF_STATUS_MAP.VOID;
    }
    if (normalized === "entered-in-error") {
      return DOCREF_STATUS_MAP.ENTERED_IN_ERROR;
    }
  }
  return DOCREF_STATUS_MAP.CURRENT;
}

export function toFhirDocumentReferenceView(
  pointer: HealthcareClinicalDocument,
  file: FhirDocumentFile,
): FhirDocumentReferenceView {
  const overlay = readOverlay(pointer.payload);
  const category = pointer.category_code ?? pointer.file_type;

  return {
    author: pointer.uploaded_by === null ? [] : [pointer.uploaded_by],
    category,
    content: [
      {
        contentType: file.contentType ?? pointer.content_type,
        creation: file.created,
        title: pointer.label,
        url: file.url,
      },
    ],
    date: pointer.uploaded_at.toISOString(),
    docStatus: mapDocStatus(pointer.doc_status, pointer.verified),
    encounter: pointer.encounter_id === null ? null : `Encounter/${pointer.encounter_id}`,
    extension:
      pointer.verified_at === null
        ? []
        : [{ url: "urn:aspen-os:verified-at", valueString: pointer.verified_at.toISOString() }],
    id: pointer.id,
    identifier: pointer.dms_file_id,
    resourceType: "DocumentReference",
    status: mapDocrefStatus(pointer.doc_status, overlay),
    subject: `Patient/${pointer.patient_id}`,
    type: pointer.file_type,
    verifier: pointer.verified_by,
  };
}
