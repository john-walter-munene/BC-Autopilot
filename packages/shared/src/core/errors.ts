export class BaseDomainError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AlCompilerError extends BaseDomainError {
  readonly diagnostics: unknown[];

  constructor(message: string, diagnostics: unknown[] = []) {
    super(message, "AL_COMPILER_ERROR", 422);
    this.diagnostics = diagnostics;
  }
}

export class PlaywrightAutomationError extends BaseDomainError {
  readonly failedStep?: number;

  constructor(message: string, failedStep?: number) {
    super(message, "PLAYWRIGHT_AUTOMATION_ERROR", 500);
    this.failedStep = failedStep;
  }
}

export class EntraIdAuthError extends BaseDomainError {
  constructor(message: string) {
    super(message, "ENTRA_ID_AUTH_ERROR", 401);
  }
}

export class SettlementDisputeError extends BaseDomainError {
  constructor(message: string) {
    super(message, "SETTLEMENT_DISPUTE_ERROR", 409);
  }
}