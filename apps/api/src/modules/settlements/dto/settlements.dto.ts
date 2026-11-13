/**
 * Settlement DTOs.
 * The canonical shapes live in settlements.service.ts; re-exported here so
 * controllers and workers import from the module boundary.
 */

export type {
  BuildSettlementInput,
  BuildSettlementResult,
  CompilerResultInput,
  SettlementRuleInput,
} from "../settlements.service.ts";