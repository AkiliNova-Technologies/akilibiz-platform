export function hasPermission(
  userPermissions: string[] | undefined,
  required: string,
) {
  if (!userPermissions) return false;
  return userPermissions.includes(required);
}

export function hasAnyPermission(
  userPermissions: string[] | undefined,
  required: string[],
) {
  if (!userPermissions) return false;
  return required.some((permission) => userPermissions.includes(permission));
}
