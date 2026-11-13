/**
 * API Gateway Domain Types
 * OData v4 and REST endpoints generator and Next.js client proxy bridge
 */

import type { EndpointDefinition, NextJsProxyFile } from '@bc-agent/shared';

export type { EndpointDefinition, NextJsProxyFile };

export interface BridgePackage {
  endpoints: EndpointDefinition[];
  proxyFiles: NextJsProxyFile[];
  swaggerSpec: Record<string, unknown>;
}
