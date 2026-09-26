# Storage Implementation Spec

Fixes five known defects in the platform `StorageUnit` so it is safe for
S3-compatible backends (SeaweedFS, RustFS, AWS S3, Cloudflare R2) and for
consumers such as `@aspen-os/dms`. All changes are edits to existing files;
no new source files. Validation uses Valibot, never Zod.

## 0. Files in scope

- `packages/platform/src/server/storage/types.ts`
- `packages/platform/src/server/storage/s3-adapter.ts`
- `packages/platform/src/server/storage/unit.ts`
- `packages/platform/src/server/storage/index.ts`
- `packages/platform/src/server/index.ts`
- `packages/dms/src/services/storage-bridge.ts` (+ call sites below)
- `packages/platform/docs/units/storage.mdx`, `packages/platform/README.md`

## 1. Key contract (applies to every fix)

Public `StorageUnit`/`S3Adapter` methods take and return **logical keys**.

- Logical key: caller-owned path, e.g. `documents/report.pdf`,
  `dms/<fileId>/v1/name.pdf`. Never contains the config `prefix` or tenant.
- Physical key: `<prefix>/<tenantId>/<logical>` (`prefix/` omitted when
  `config.prefix` is unset). Built only inside `StorageUnit` via `getKey`.
- `file_metadata.key` stores the logical key alongside `tenant_id`.
  The physical key is never persisted.
- `list(logicalPrefix?)` sends the physical prefix to S3 and returns
  logical keys. Bare `list()` scopes to the caller tenant prefix, never
  the whole bucket.

Document this on every public method via TSDoc and in
`docs/units/storage.mdx` ("Key prefixing" section).

---

## FIX-1 — Export storage types publicly

**Problem.** `storage/index.ts` and `server/index.ts` export only
`StorageConfig`/`StorageUnit`. `FileUploadInput`, `FileObject`,
`SignedUrlOptions`, `ListOptions` (and `StorageProvider`) are unreachable
without deep imports, so DMS duplicated them
(`dms/src/services/storage-bridge.ts:12-17`).

**Decision.** Re-export the full type surface; DMS deletes its duplicates
and aliases the platform types (zero caller churn).

**Changes.**

1. `packages/platform/src/server/storage/index.ts`:
   ```ts
   export { StorageUnit } from "./unit";
   export type {
     FileObject,
     FileUploadInput,
     ListOptions,
     SignedPutUrlOptions,
     SignedUrlOptions,
     StorageConfig,
     StorageProvider,
   } from "./types";
   ```
   (`SignedPutUrlOptions` is added by FIX-3; include it here.)
2. `packages/platform/src/server/index.ts`: extend the `import type`
   from `#/server/storage` and the `export type` block with the same
   seven names. Keep the separate `export type {}` block style
   (`verbatimModuleSyntax`).
3. `packages/dms/src/services/storage-bridge.ts`: delete `DmsFileObject` /
   `DmsUploadInput` interfaces, replace with:
   ```ts
   import type { FileObject, FileUploadInput } from "@aspen-os/platform/server";
   export type DmsFileObject = FileObject;
   export type DmsUploadInput = FileUploadInput;
   ```
   Never import `#/server/storage/types` cross-package.

**Acceptance.**

- [ ] `grep -rn "server/storage/types" packages/dms/src` returns nothing.
- [ ] `cd packages/platform && bun run check:types` passes.
- [ ] `cd packages/dms && bun run check:types` passes.

## FIX-2 — URL-encode `CopySource`

**Problem.** `s3-adapter.ts:168` sends
`CopySource: \`${bucket}/${getKey(sourceKey)}\``raw. Keys with spaces,
unicode,`+`, `#` break on strict S3-compatibles. AWS requires the
URL-encoded form.

**Decision.** Encode each `/`-separated segment once, after `getKey`.

**Changes** (`packages/platform/src/server/storage/s3-adapter.ts` only):

```ts
function encodeCopySource(bucket: string, physicalKey: string): string {
  return `${bucket}/${physicalKey.split("/").map((segment) => encodeURIComponent(segment)).join("/")}`;
}

// in copy():
CopySource: encodeCopySource(this.bucket, this.getKey(sourceKey)),
```

Rules: use `encodeURIComponent` per segment (never `encodeURI`, which
leaves spaces); never pre-encode before `getKey` (double-encoding);
bucket name is passed through (DNS-safe by FIX-4 validation).

**Acceptance.**

- [ ] Key `docs/my file (1).pdf` copies to
      `<bucket>/…/docs/my%20file%20(1).pdf` on the wire.
- [ ] Key with unicode (`docs/ünïcode.pdf`) round-trips
      `copy` → `getMetadata` on SeaweedFS and MinIO/RustFS.
- [ ] `bun run check:types` + `check:lint` pass in `packages/platform`.

## FIX-3 — Correct presigned-PUT options

**Problem.** `SignedUrlOptions` carries GET response overrides
(`responseContentType`, `responseContentDisposition`), but
`getSignedPutUrl` (`s3-adapter.ts:104-109`) misreads
`responseContentType` as the PUT `ContentType`. Callers cannot set the
upload content type (or cache control) correctly.

**Decision.** Keep `SignedUrlOptions` for GET; add a dedicated PUT type.

**Changes.**

1. `types.ts`: add
   ```ts
   export interface SignedPutUrlOptions {
     cacheControl?: string;
     contentType?: string;
     expiresIn?: number;
   }
   ```
   Leave `SignedUrlOptions` untouched.
2. `s3-adapter.ts`: change signature to
   `getSignedPutUrl(key: string, options?: SignedPutUrlOptions)` and build
   ```ts
   new PutObjectCommand({
     Bucket: this.bucket,
     CacheControl: options?.cacheControl,
     ContentType: options?.contentType,
     Key: this.getKey(key),
   });
   ```
3. `unit.ts`: mirror the signature/passthrough with `import type`
   updates.
4. `storage/index.ts` + `server/index.ts`: export the new type (see FIX-1).
5. Docs: `storage.mdx` signed-URL section shows
   `getSignedPutUrl(key, { expiresIn, contentType })`.

**Acceptance.**

- [ ] Existing `getSignedPutUrl(key, { expiresIn })` calls still compile.
- [ ] PUT URL signed with `contentType` enforces it on upload (smoke test).
- [ ] GET path behavior unchanged.

## FIX-4 — Validate `StorageConfig` at construction

**Problem.** Empty `bucket`, malformed `endpoint`, empty `region` /
credentials, or a `prefix` with leading/trailing slashes fail only on
the first S3 call.

**Decision.** Valibot schema parsed in the `StorageUnit` constructor;
throws before any `S3Client` use. Colocate the schema in `types.ts`
(no new file).

**Changes.**

1. `types.ts`: add Valibot schemas (runtime `import`, plus
   `import type { InferOutput }` for the type check):
   ```ts
   import {
     boolean,
     literal,
     maxLength,
     minLength,
     object,
     optional,
     parse,
     pipe,
     regex,
     string,
     url,
   } from "valibot";
   ```
   - `StorageProviderSchema`: `type: literal("s3")`,
     `endpoint: pipe(string(), url())`,
     `region: pipe(string(), minLength(1))`,
     `credentials: object({ accessKeyId: pipe(string(), minLength(1)), secretAccessKey: pipe(string(), minLength(1)) })`,
     `forcePathStyle: boolean()`.
   - `StorageConfigSchema`: `bucket: pipe(string(), minLength(3), maxLength(63), regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/))`,
     `prefix: optional(pipe(string(), minLength(1), maxLength(1024), regex(/^(?!.*\.\.)(?![/])(?!.*\/$)[A-Za-z0-9._/-]+$/)))`,
     `provider: StorageProviderSchema`.
   - Assert parity: `type _Assert = [InferOutput<typeof StorageConfigSchema>] extends [StorageConfig] ? true : never;`
     (adjust field optionality until it holds; schema is source of truth
     for the interface).
2. `unit.ts` constructor first line:
   ```ts
   this.config = parse(StorageConfigSchema, config);
   ```
   then use `this.config` for the `getKey` closure. Normalize the
   endpoint (strip trailing `/`) before `new S3Client` — either in the
   schema via `transform` or in `S3Adapter` construction.
3. R2 note: `region: "auto"` and `forcePathStyle: false` are valid inputs;
   SeaweedFS/RustFS/MinIO use a real region + `forcePathStyle: true`.
   Document both in `storage.mdx`.

**Acceptance.**

- [ ] Empty bucket, non-URL endpoint, empty region/credentials, and
      `prefix: "/leading"` / `"trailing/"` / `"a/../b"` each throw at
      `new StorageUnit(...)` / `Platform.create(...)`, not on first upload.
- [ ] `bucket: "recruiter"`, `endpoint: "http://localhost:8333"`,
      `region: "us-east-1"`, `forcePathStyle: true` still passes.
- [ ] `bun run check:types` passes (Valibot `InferOutput` matches
      `StorageConfig`).

## FIX-5 — End DMS double tenant nesting; return logical keys from `list`

**Problem.** The unit invisibly prefixes `<prefix>/<ctx-tenant>/`, while
`computeStorageKey` (`storage-bridge.ts:19-28`) embeds `dms/<tenant>/…`,
yielding `uploads/<ctx-tenant>/dms/<dms-tenant>/…`. Docs describe the S3
key as `dms/{tenant}/…`, which is false. Corollaries: `list()` strips the
wrong prefix (returns physical or mangled keys) and bare `list()` scans
the whole bucket across tenants.

**Decision.** Canonical logical-key rule (§1): callers never embed tenant
or config prefix; the unit owns the single `<prefix>/<ctx-tenant>/`
mapping. DMS drops its embedded tenant.

**Changes.**

1. `storage-bridge.ts`:
   ```ts
   export function computeStorageKey(input: {
     fileId: string;
     name: string;
     version: number;
   }): string {
     const safeName = input.name.replaceAll(/[\\/]+/g, "_").replaceAll("\0", "");
     return `dms/${input.fileId}/v${input.version}/${safeName}`;
   }
   ```
   `computeArchiveKey` (`archives/<folder>/<uuid>.zip`) is already
   tenant-free — keep. Update every caller passing `tenantId`
   (`version-service.ts`, `workflows/file/upload.ts`,
   `workflows/file/copy.ts`, `workflows/services.ts` re-export needs no
   change). Current call sites overwhelmingly omit `tenantId` already;
   delete the parameter outright (breaking but trivially fixed).
2. `s3-adapter.ts` `list()`: add tenant-prefix awareness. Extend
   `S3AdapterConfig` with `getKeyPrefix: () => string` (unit supplies
   `getKey("")`, i.e. `<prefix>/<tenantId>/`). Then:
   - `Prefix` sent to S3 = `prefix ? getKey(prefix) : getKeyPrefix()`.
   - Strip `getKeyPrefix()` from every returned `Key` to yield logical
     keys; drop entries not under the prefix (defensive, never leak
     another tenant).
   - Handle both `prefix` spellings (`"documents"` and `"documents/"`)
     identically — normalize before `getKey`.
3. Docs: rewrite the "Key prefixing" section with logical-vs-physical
   definitions, the DMS example (`dms/<fileId>/v1/name.pdf` →
   `uploads/<tenant>/dms/<fileId>/v1/name.pdf`), and the
   "never embed tenant" rule. Mirror in `README.md` StorageUnit section.

**Acceptance.**

- [ ] No `computeStorageKey({ …, tenantId` call sites remain.
- [ ] `list("documents")`, `list("documents/")`, and `list()` all return
      logical keys (`documents/report.pdf`), never physical.
- [ ] Bare `list()` Prefix equals the tenant prefix (verified via logged
      S3 request or mock); no cross-tenant rows.
- [ ] `file_metadata.key` values equal the keys returned by `list()`.
- [ ] `bun run check:types` + `check:lint` pass in `platform` and `dms`.

## 2. Rollout order

1. FIX-1 (exports) + FIX-3 (PUT type) — type-only, unblocks DMS cleanup.
2. FIX-4 (validation) — constructor-only, no behavior change for valid configs.
3. FIX-2 (CopySource) — one-line behavior fix, smoke-test with space/unicode keys.
4. FIX-5 (DMS keys + `list`) — needs S3 smoke + DMS regression pass.
5. Docs (`storage.mdx`, `README.md`) with each fix, not after.

## 3. Verification matrix

- `cd packages/platform && bun run check:types && bun run check:lint`
- `cd packages/dms && bun run check:types && bun run check:lint`
- S3 smoke (SeaweedFS stub in `examples/recruiter/seaweedfs-s3.json`):
  upload → get → getMetadata → copy → list → move → archive → remove,
  with keys `plain.pdf`, `docs/my file (1).pdf`, `docs/ünïcode.pdf`.
- Compat notes: SeaweedFS/RustFS/MinIO `forcePathStyle: true`;
  R2 `region: "auto"`, `forcePathStyle: false`, account endpoint.
- Data: pre-production buckets written with the old double prefix are
  orphaned by FIX-5; either discard the bucket or run a one-off
  copy-to-logical-key backfill before deploying FIX-5.
