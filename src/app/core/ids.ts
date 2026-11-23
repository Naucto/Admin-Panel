/** The release id the analytics give to activity outside a game. It names no game. */
export const NO_RELEASE_ID = '00000000-0000-0000-0000-000000000000';

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * The id a value from outside the API spells, such as a query parameter or something this browser
 * stored, in the lower case the backend answers ids in so that it equals them. Undefined for
 * anything that is not one.
 */
export function idOf(value: unknown): string | undefined {
  const id = typeof value === 'string' ? value.toLowerCase() : '';
  return ID_PATTERN.test(id) ? id : undefined;
}
