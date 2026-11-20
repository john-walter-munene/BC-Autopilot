/**
 * BC Agent shared constants: AL object ID ranges, runtime flags, and compiler defaults.
 */

export const BC_CONSTANTS = {
  DEFAULT_RUNTIME: "13.0",
  DEFAULT_TARGET: "Cloud",
  DEFAULT_ID_RANGE_FROM: 50100,
  DEFAULT_ID_RANGE_TO: 50149,
  DEFAULT_PUBLISHER: "alc",
  DEFAULT_GROUP: "integrations",
  DEFAULT_API_VERSION: "v2.0",
  MICROSOFT_ENTRA_SCOPE: "https://api.businesscentral.dynamics.com/.default",
  DEFAULT_PORT: 3000,
} as const;

export const AL_OBJECT_ID_RANGE = {
  CUSTOMER_RANGE_START: 50100,
  CUSTOMER_RANGE_END: 50149,
  APP_SOURCE_ISV_START: 70000000,
  APP_SOURCE_ISV_END: 74999999,
  ON_PREM_PER_TENANT_START: 50000,
  ON_PREM_PER_TENANT_END: 99999,
} as const;

/** The per-tenant custom range the agent allocates object IDs from. */
export const AL_ID_RANGE = {
  from: AL_OBJECT_ID_RANGE.CUSTOMER_RANGE_START,
  to: AL_OBJECT_ID_RANGE.CUSTOMER_RANGE_END,
} as const;

/** Returns true when `id` falls inside the agent's allocated custom range. */
export function isInAllocatedRange(id: number): boolean {
  return Number.isInteger(id) && id >= AL_ID_RANGE.from && id <= AL_ID_RANGE.to;
}
