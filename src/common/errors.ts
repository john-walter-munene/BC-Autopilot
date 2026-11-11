export class BaseDomainError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 400) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AlCompilerError extends BaseDomainError {
  constructor(message: string, public readonly diagnostics: any[] = []) {
    super(message, 'AL_COMPILER_ERROR', 422);
  }
}

export class PlaywrightAutomationError extends BaseDomainError {
  constructor(message: string, public readonly failedStep?: number) {
    super(message, 'PLAYWRIGHT_AUTOMATION_ERROR', 500);
  }
}

export class EntraIdAuthError extends BaseDomainError {
  constructor(message: string) {
    super(message, 'ENTRA_ID_AUTH_ERROR', 401);
  }
}

export class SettlementDisputeError extends BaseDomainError {
  constructor(message: string) {
    super(message, 'SETTLEMENT_DISPUTE_ERROR', 409);
  }
}
