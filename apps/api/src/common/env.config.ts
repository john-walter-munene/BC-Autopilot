import { BC_CONSTANTS } from '@bc-agent/shared';

export interface AppConfig {
  bcWebUrl: string;
  environment: string;
  companyName: string;
  tenantId: string;
  clientId?: string;
  clientSecret?: string;
  idRangeFrom: number;
  idRangeTo: number;
  playwrightHeadless: boolean;
  port: number;
}

export const defaultAppConfig: AppConfig = {
  bcWebUrl: 'https://businesscentral.dynamics.com/sandbox',
  environment: 'Sandbox',
  companyName: 'CRONUS USA, Inc.',
  tenantId: '72f988bf-86f1-41af-91ab-2d7cd011db47',
  idRangeFrom: BC_CONSTANTS.DEFAULT_ID_RANGE_FROM,
  idRangeTo: BC_CONSTANTS.DEFAULT_ID_RANGE_TO,
  playwrightHeadless: true,
  port: BC_CONSTANTS.DEFAULT_PORT,
};
