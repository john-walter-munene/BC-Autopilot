
/**
 * Business Central OData v4 boundary error.
 * `kind` lets callers decide without parsing messages; `retryable` mirrors the HTTP semantics.
 */

import { BaseDomainError } from '../core/errors.ts';

export type BcODataErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'rate_limited'
  | 'server'
  | 'network'
  | 'timeout';

export interface BcODataErrorDetails {
  kind: BcODataErrorKind;
  /** HTTP status, or null for transport failures */
  status: number | null;
  /** OData error code from the payload, when present */
  odataCode?: string;
  retryable: boolean;
  /** Method and entity set, for logs — never includes the bearer token */
  request?: { method: string; entitySet: string };
}

export class BcODataError extends BaseDomainError {
  readonly kind: BcODataErrorKind;
  readonly httpStatus: number | null;
  readonly odataCode?: string;
  readonly retryable: boolean;
  readonly request?: { method: string; entitySet: string };

  constructor(message: string, details: BcODataErrorDetails) {
    super(message, 'BC_ODATA_ERROR', statusFor(details.kind));
    this.kind = details.kind;
    this.httpStatus = details.status;
    this.odataCode = details.odataCode;
    this.retryable = details.retryable;
    this.request = details.request;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      kind: this.kind,
      message: this.message,
      httpStatus: this.httpStatus,
      odataCode: this.odataCode,
      retryable: this.retryable,
      request: this.request,
    };
  }
}

function statusFor(kind: BcODataErrorKind): number {
  switch (kind) {
    case 'unauthorized':
      return 401;
    case 'forbidden':
      return 403;
    case 'not_found':
      return 404;
    case 'validation':
      return 422;
    case 'conflict':
      return 409;
    case 'rate_limited':
      return 429;
    case 'timeout':
      return 504;
    case 'network':
      return 502;
    case 'server':
    default:
      return 500;
  }
}

/** Narrow an unknown thrown value to a BcODataError, for tests and callers. */
export function isBcODataError(error: unknown): error is BcODataError {
  return error instanceof BcODataError;
}
