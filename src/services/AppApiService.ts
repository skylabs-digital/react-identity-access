import { HttpService } from './HttpService';
import type {
  ApiResponse,
  App,
  CreateAppRequest,
  PublicAppInfo,
  PaginationParams,
} from '../types/api';
import { buildPaginationQuery } from '../utils/query';

export class AppApiService {
  constructor(private httpService: HttpService) {}

  async createApp(request: CreateAppRequest): Promise<App> {
    const response = await this.httpService.post<ApiResponse<App>>('/apps/', request);
    return response.data;
  }

  async getApps(params?: PaginationParams): Promise<{ apps: App[]; meta: any }> {
    const response = await this.httpService.get<ApiResponse<App[]>>(
      `/apps/${buildPaginationQuery(params)}`
    );
    return { apps: response.data, meta: response.meta };
  }

  async getAppById(id: string): Promise<App> {
    const response = await this.httpService.get<ApiResponse<App>>(`/apps/${id}`);
    return response.data;
  }

  async updateApp(id: string, request: Partial<CreateAppRequest>): Promise<App> {
    const response = await this.httpService.put<ApiResponse<App>>(`/apps/${id}`, request);
    return response.data;
  }

  async getPublicAppInfo(id: string): Promise<PublicAppInfo> {
    const response = await this.httpService.get<ApiResponse<PublicAppInfo>>(`/apps/${id}/public`, {
      skipAuth: true,
    });
    return response.data;
  }

  async setDefaultSubscriptionPlan(appId: string, planId: string): Promise<App> {
    const response = await this.httpService.put<ApiResponse<App>>(
      `/apps/${appId}/default-subscription-plan`,
      { planId }
    );
    return response.data;
  }

  async updateSettingsSchema(appId: string, schema: any, defaultSettings: any): Promise<App> {
    const response = await this.httpService.put<ApiResponse<App>>(
      `/apps/${appId}/settings-schema`,
      { schema, defaultSettings }
    );
    return response.data;
  }

  async exportConfig(appId: string): Promise<any> {
    const response = await this.httpService.get<ApiResponse<any>>(`/apps/${appId}/export-config`);
    return response.data;
  }
}
