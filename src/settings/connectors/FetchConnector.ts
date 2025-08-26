import { SettingsConnector } from '../core/types';

export interface FetchConnectorConfig {
  baseUrl: string;
  apiKey: string;
  fetchModule?: typeof fetch;
  fetchFn?: typeof fetch;
}

export class FetchConnector implements SettingsConnector {
  private baseUrl: string;
  private apiKey: string;
  private fetchFn: typeof fetch;

  constructor(config: FetchConnectorConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.fetchFn = config.fetchFn || config.fetchModule || fetch;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;

    const response = await this.fetchFn(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.success ? data.data : data;
  }

  async getPublicSettings(appId: string, tenantId: string): Promise<any> {
    try {
      const data = await this.makeRequest(`/settings/${appId}/${tenantId}/public`);
      return data.settings;
    } catch (error) {
      console.warn('Failed to load public settings:', error);
      return null;
    }
  }

  async getPrivateSettings(appId: string, tenantId: string): Promise<any> {
    try {
      const data = await this.makeRequest(`/settings/${appId}/${tenantId}/private`);
      return data.settings;
    } catch (error) {
      console.warn('Failed to load private settings:', error);
      return null;
    }
  }

  async updateSettings(appId: string, tenantId: string, settings: any): Promise<void> {
    await this.makeRequest(`/settings/${appId}/${tenantId}`, {
      method: 'PUT',
      body: JSON.stringify({
        settings,
        version: '1.0.0', // TODO: Get version from context
      }),
    });
  }

  async getSchema(appId: string, _tenantId: string): Promise<any> {
    try {
      const data = await this.makeRequest(`/settings/${appId}/schema`);
      return data;
    } catch (error) {
      console.warn('Failed to load schema:', error);
      return null;
    }
  }

  async updateSchema(appId: string, tenantId: string, schema: any, version: string): Promise<void> {
    await this.makeRequest(`/settings/${appId}/${tenantId}/schema`, {
      method: 'POST',
      body: JSON.stringify({
        schema,
        version,
      }),
    });
  }
}

export const createFetchConnector = (config: FetchConnectorConfig): FetchConnector => {
  return new FetchConnector(config);
};
