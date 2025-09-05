import { HttpService } from './HttpService';
import { SessionManager } from './SessionManager';
import type { App, CreateAppRequest, ApiResponse, PaginationParams } from '../types/api';

export class AppApiService {
  constructor(
    private httpService: HttpService,
    private sessionManager: SessionManager
  ) {}

  async createApp(request: CreateAppRequest): Promise<App> {
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.post<ApiResponse<App>>('/apps/', request, {
      headers: authHeaders,
    });
    return response.data;
  }

  async getApps(params?: PaginationParams): Promise<{ apps: App[]; meta: any }> {
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `/apps/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.httpService.get<ApiResponse<App[]>>(url, {
      headers: authHeaders,
    });

    return {
      apps: response.data,
      meta: response.meta,
    };
  }

  async getAppById(id: string): Promise<App> {
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.get<ApiResponse<App>>(`/apps/${id}`, {
      headers: authHeaders,
    });
    return response.data;
  }

  async updateApp(id: string, request: Partial<CreateAppRequest>): Promise<App> {
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.put<ApiResponse<App>>(`/apps/${id}`, request, {
      headers: authHeaders,
    });
    return response.data;
  }

  async setDefaultSubscriptionPlan(appId: string, planId: string): Promise<App> {
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.put<ApiResponse<App>>(
      `/apps/${appId}/default-subscription-plan`,
      { planId },
      { headers: authHeaders }
    );
    return response.data;
  }

  async updateSettingsSchema(appId: string, schema: any, defaultSettings: any): Promise<App> {
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.put<ApiResponse<App>>(
      `/apps/${appId}/settings-schema`,
      { schema, defaultSettings },
      { headers: authHeaders }
    );
    return response.data;
  }

  async exportConfig(appId: string): Promise<any> {
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.get<ApiResponse<any>>(`/apps/${appId}/export-config`, {
      headers: authHeaders,
    });
    return response.data;
  }
}
