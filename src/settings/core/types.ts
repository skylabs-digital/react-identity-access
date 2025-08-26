import { z } from 'zod';

export interface SettingsConnector {
  getPublicSettings(appId: string, tenantId: string): Promise<any>;
  getPrivateSettings(appId: string, tenantId: string): Promise<any>;
  updateSettings(appId: string, tenantId: string, settings: any): Promise<void>;
  getSchema(appId: string, tenantId: string): Promise<any>;
  updateSchema(appId: string, tenantId: string, schema: any, version: string): Promise<void>;
}

export interface SettingsProviderProps {
  appId: string;
  tenantId?: string;
  schema: z.ZodObject<any>;
  version: string;
  defaults: any;
  connector: SettingsConnector;
  isAuthenticated?: boolean;
  children: React.ReactNode;
}

export interface SettingsContextValue {
  settings: any;
  publicSettings: any;
  updateSetting: (key: string, value: any) => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  schema: z.ZodObject<any>;
  version: string;
}

export interface AuthContext {
  isAuthenticated: boolean;
  user?: any;
}
