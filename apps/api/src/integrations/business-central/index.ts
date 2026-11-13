/**
 * Business Central integration surface.
 * Wraps the shared AL compiler CLI, symbol cache, publish bridge and container sandbox
 * so the API layer depends on one explicit boundary.
 *
 * Overlay counterpart: apps/api/src/integrations/ (external system adapters).
 */

export {
  AlcRunner,
  alcRunner,
  buildAlcArgs,
  defaultOutputPath,
  resolveAlcPath,
} from "@bc-agent/shared";
export {
  SymbolCacheService,
  symbolCacheService,
  parseSymbolPackageName,
  fingerprintPackage,
  SYMBOL_CACHE_DIR_NAME,
  SYMBOL_CACHE_MANIFEST_NAME,
} from "@bc-agent/shared";
export { PublishService, publishService, buildPublishArgs } from "@bc-agent/shared";
export {
  ContainerSandboxService,
  containerSandboxService,
  buildNewContainerArgs,
  deriveContainerEndpoints,
} from "@bc-agent/shared";
export { AlProjectWriter, alProjectWriter, buildAppJson } from "@bc-agent/shared";
export { Phase1Pipeline, phase1Pipeline } from "@bc-agent/shared";
export { parseAlcOutput, parseAlcLine, formatAlcDiagnostics, groupDiagnosticsByFile } from "@bc-agent/shared";