/**
 * API Gateway & Next.js Bridge Service
 * Exposes Business Central OData/REST endpoints with typed client integration
 * Mirrors Overlay (CognitronTechnologies / john-walter-munene) API gateway architecture
 */

import { generateEndpointDefinitions, generateNextJsProxyFiles } from '../../common/generators/endpoint-generator.ts';
import type { EndpointDefinition, NextJsProxyFile } from '@bc-agent/shared';
import type { BridgePackage } from './dto/api-gateway.dto.ts';

export class ApiGatewayService {
  createBridge(customFields?: string[]): BridgePackage {
    const endpoints: EndpointDefinition[] = generateEndpointDefinitions(customFields);
    const proxyFiles: NextJsProxyFile[] = generateNextJsProxyFiles();

    const swaggerSpec: Record<string, unknown> = {
      openapi: '3.0.0',
      info: {
        title: 'Dynamics 365 Business Central Autonomous Customization API',
        version: '2.0.0'
      },
      servers: [
        { url: '/api/v2.0' }
      ],
      paths: {
        '/customerAssessments': {
          get: {
            summary: 'List Customer Assessment records with custom AL fields',
            responses: {
              200: { description: 'Successful array response' }
            }
          }
        }
      }
    };

    return {
      endpoints,
      proxyFiles,
      swaggerSpec
    };
  }
}

export const apiGatewayService = new ApiGatewayService();
