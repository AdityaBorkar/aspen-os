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
export function defineAcl<const T extends Record<string, readonly string[]>>(
  acl: T,
): T {
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
export type ExtractResources<T extends AclDeclaration> = keyof T;

/**
 * Extract allowed actions for a given resource from an ACL declaration.
 */
export type ExtractActions<
  T extends AclDeclaration,
  R extends keyof T,
> = T[R][number];
