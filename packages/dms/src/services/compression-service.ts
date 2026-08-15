import type { CompressionOption } from "#/schemas";

export interface CompressionResult {
  content: Buffer | undefined;
  option: { enabled: boolean; reason?: string };
}

export interface ResolvedCompression {
  enabled: boolean;
  mode: string;
  quality?: number;
  format?: string;
  reason?: string;
}

/**
 * Resolves the effective compression option for an upload/version.
 * Override wins; otherwise the org default is used.
 */
export function resolveCompression(
  override: CompressionOption | null | undefined,
  orgDefault: CompressionOption,
): ResolvedCompression {
  if (!override) {
    return {
      enabled: orgDefault.enabled,
      format: orgDefault.format,
      mode: orgDefault.mode,
      quality: orgDefault.quality,
    };
  }
  return {
    enabled: override.enabled,
    format: override.format,
    mode: override.mode,
    quality: override.quality,
  };
}

/**
 * Runs the compression/optimization step for a version. Safe-fails by design:
 * on any error the original bytes are returned unchanged and the version is
 * flagged `compression: { enabled: false, reason }`.
 */
export async function runCompression(
  body: Buffer,
  option: CompressionOption,
): Promise<CompressionResult> {
  if (!option.enabled || option.mode === "none") {
    return {
      content: body,
      option: { enabled: false },
    };
  }

  try {
    // No-op implementation: DMS currently stores the original bytes for every
    // Mode. The mode/quality/format are recorded on the version for future
    // Pipeline integration (archive, image re-encode, pdf optimize).
    return {
      content: body,
      option: {
        enabled: false,
        reason: "compression_pipeline_not_configured",
      },
    };
  } catch {
    return {
      content: body,
      option: {
        enabled: false,
        reason: "compression_failed",
      },
    };
  }
}
