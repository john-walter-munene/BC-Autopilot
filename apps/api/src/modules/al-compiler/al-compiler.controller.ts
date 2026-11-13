/**
 * AL compiler controller: Phase 1 API surface.
 * Overlay counterpart: apps/api/src/modules/<name>/<name>.controller.ts
 *
 * Thin transport layer - all behaviour lives in the shared pipeline.
 */

import {
  Phase1Pipeline,
  phase1Pipeline,
  SymbolCacheService,
  symbolCacheService,
  PublishService,
  publishService,
  ContainerSandboxService,
  containerSandboxService,
} from "../../integrations/business-central/index.ts";
import type {
  Phase1PipelineRequest,
  Phase1PipelineResult,
  PublishRequest,
  PublishResult,
  ContainerSandboxRequest,
  ContainerSandboxResult,
  SymbolCacheSyncResult,
  SymbolPackageSource,
} from "@bc-agent/shared";

export interface AlCompilerControllerDeps {
  pipeline?: Phase1Pipeline;
  symbols?: SymbolCacheService;
  publisher?: PublishService;
  sandbox?: ContainerSandboxService;
}

export class AlCompilerController {
  private readonly pipeline: Phase1Pipeline;
  private readonly symbols: SymbolCacheService;
  private readonly publisher: PublishService;
  private readonly sandbox: ContainerSandboxService;

  constructor(deps: AlCompilerControllerDeps = {}) {
    this.pipeline = deps.pipeline ?? phase1Pipeline;
    this.symbols = deps.symbols ?? symbolCacheService;
    this.publisher = deps.publisher ?? publishService;
    this.sandbox = deps.sandbox ?? containerSandboxService;
  }

  /** Write, compile and optionally publish an AL extension. */
  async compile(request: Phase1PipelineRequest): Promise<Phase1PipelineResult> {
    return this.pipeline.execute(request);
  }

  /** Sync the .alpackages symbol cache. */
  syncSymbols(cachePath: string, sources: SymbolPackageSource[], keep?: string[]): SymbolCacheSyncResult {
    return this.symbols.sync({ cachePath, keep }, sources);
  }

  /** Publish a compiled .app package to a container. */
  async publish(request: PublishRequest): Promise<PublishResult> {
    return this.publisher.publish(request);
  }

  /** Provision a Business Central container sandbox. */
  async provisionSandbox(request: ContainerSandboxRequest): Promise<ContainerSandboxResult> {
    return this.sandbox.provision(request);
  }
}

export const alCompilerController = new AlCompilerController();