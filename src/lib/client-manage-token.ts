const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isClientManageTokenFormat(value: string): boolean {
  return value.length >= 32 && value.length <= 40 && UUID_RE.test(value);
}
