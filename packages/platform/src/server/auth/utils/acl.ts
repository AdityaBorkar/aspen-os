/**
 * Type helper for modules to declare their auth ACL.
 *
 * Usage:
 * ```ts
 * import { defineAcl } from "@aspen-os/platform/server";
 *
 * export const acl = defineAcl({
 *   address: ["create", "read", "update", "delete", "set_primary"],
 *   bankAccount: ["create", "read", "update", "delete"],
 * });
 * ```
 */
export function defineAcl<const TAcl extends Record<string, readonly string[]>>(acl: TAcl): TAcl {
  return acl;
}

/**
 * ACL declaration type for modules.
 * Keys are resource names, values are arrays of allowed actions.
 */
export type AclDeclaration = Record<string, readonly string[]>;

/**
 * Extract resource names from an ACL declaration.
 */
export type ExtractResources<TAcl extends AclDeclaration> = keyof TAcl;

/**
 * Extract allowed actions for a given resource from an ACL declaration.
 */
export type ExtractActions<
  TAcl extends AclDeclaration,
  TResource extends keyof TAcl,
> = TAcl[TResource][number];
