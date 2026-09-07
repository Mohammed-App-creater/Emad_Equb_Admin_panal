export function hasPermission(
    permissions: string[] | undefined,
    required: string
): boolean {
    if (!permissions || permissions.length === 0) return false;

    return permissions.includes(required);
}

export function hasAnyPermission(
    permissions: string[] | undefined,
    required: string[]
): boolean {
    if (!permissions) return false;

    return required.some(p => permissions.includes(p));
}

export function hasAllPermissions(
  permissions: string[] | undefined,
  required: string[]
): boolean {
  if (!permissions) return false;

  return required.every(p => permissions.includes(p));
}
