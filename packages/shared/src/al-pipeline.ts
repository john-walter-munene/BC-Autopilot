/**
 * Phase 1 Pipeline
 * Writes the AL project, compiles it with the physical `alc.exe`, optionally publishes it to a
 * Business Central container, and seals the result with a deterministic SHA-256 fingerprint.
 */

import fs from 'node:fs';
import path from 'node:path';
import { generateSha256Fingerprint } from './crypto.ts';
import { AlProjectWriter, alProjectWriter } from './al-project-writer.ts';
import { AlcRunner, alcRunner, defaultOutputPath } from './alc-runner.ts';
import { PublishService, publishService } from './publish-bridge.ts';
import type { Phase1PipelineRequest, Phase1PipelineResult } from './al-cli-types.ts';

export interface Phase1PipelineDeps {
  writer?: AlProjectWriter;
  runner?: AlcRunner;
  publisher?: PublishService;
  fileExists?: (filePath: string) => boolean;
  readFile?: (filePath: string) => Buffer;
}

export class Phase1Pipeline {
  private readonly writer: AlProjectWriter;
  private readonly runner: AlcRunner;
  private readonly publisher: PublishService;
  private readonly fileExists: (filePath: string) => boolean;
  private readonly readFile: (filePath: string) => Buffer;

  constructor(deps: Phase1PipelineDeps = {}) {
    this.writer = deps.writer ?? alProjectWriter;
    this.runner = deps.runner ?? alcRunner;
    this.publisher = deps.publisher ?? publishService;
    this.fileExists = deps.fileExists ?? ((filePath: string) => fs.existsSync(filePath));
    this.readFile = deps.readFile ?? ((filePath: string) => fs.readFileSync(filePath));
  }

  async execute(request: Phase1PipelineRequest): Promise<Phase1PipelineResult> {
    const project = this.writer.writeProject({
      manifest: request.manifest,
      files: request.files,
      outDir: request.projectDir,
    });

    const outputPath =
      request.outputPath ??
      defaultOutputPath(project.projectPath, 'alc', request.manifest.name, request.manifest.version);

    const compile = await this.runner.run({
      projectPath: project.projectPath,
      packageCachePath: path.resolve(request.symbolCachePath),
      outputPath,
      alcPath: request.alcPath,
      extraArgs: request.extraArgs,
    });

    let publish: Phase1PipelineResult['publish'];
    if (request.publish && compile.success) {
      publish = await this.publisher.publish({ ...request.publish, appPath: compile.outputPath });
    }

    const fingerprint = this.fingerprint(compile.outputPath, request);

    return {
      project,
      compile,
      publish,
      success: compile.success && (publish ? publish.success : true),
      fingerprint,
    };
  }

  private fingerprint(packagePath: string, request: Phase1PipelineRequest): string {
    if (packagePath && this.fileExists(packagePath)) {
      return generateSha256Fingerprint(this.readFile(packagePath).toString('base64'));
    }
    const payload = JSON.stringify(request.manifest) + request.files.map(f => f.codeContent).join('\n');
    return generateSha256Fingerprint(payload);
  }
}

export const phase1Pipeline = new Phase1Pipeline();
