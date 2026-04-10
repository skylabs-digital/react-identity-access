import { HttpService } from './HttpService';
import type {
  ApiResponse,
  FeatureFlagItem,
  FeatureFlagValueResponse,
  FeatureFlag,
  CreateFeatureFlagRequest,
  PaginationParams,
} from '../types/api';
import { buildPaginationQuery } from '../utils/query';

export class FeatureFlagApiService {
  constructor(private httpService: HttpService) {}

  async createFeatureFlag(request: CreateFeatureFlagRequest): Promise<FeatureFlag> {
    const response = await this.httpService.post<ApiResponse<FeatureFlag>>(
      '/feature-flags/',
      request
    );
    return response.data;
  }

  async getFeatureFlags(
    params?: PaginationParams
  ): Promise<{ featureFlags: FeatureFlag[]; meta: any }> {
    const response = await this.httpService.get<ApiResponse<FeatureFlag[]>>(
      `/feature-flags/${buildPaginationQuery(params)}`
    );
    return { featureFlags: response.data, meta: response.meta };
  }

  async getFeatureFlagById(id: string): Promise<FeatureFlag> {
    const response = await this.httpService.get<ApiResponse<FeatureFlag>>(`/feature-flags/${id}`);
    return response.data;
  }

  async updateFeatureFlag(
    id: string,
    request: Partial<CreateFeatureFlagRequest>
  ): Promise<FeatureFlag> {
    const response = await this.httpService.put<ApiResponse<FeatureFlag>>(
      `/feature-flags/${id}`,
      request
    );
    return response.data;
  }

  async deleteFeatureFlag(id: string): Promise<void> {
    await this.httpService.delete<void>(`/feature-flags/${id}`);
  }

  async getTenantFeatureFlags(tenantId: string, appId: string): Promise<FeatureFlagItem[]> {
    if (!tenantId || !appId) {
      throw new Error('Tenant ID and App ID are required');
    }

    const query = buildPaginationQuery({ tenantId, appId });
    const response = await this.httpService.get<ApiResponse<FeatureFlagItem[]>>(
      `/tenant-feature-flags${query}`,
      { headers: { 'X-Tenant-ID': tenantId }, skipAuth: true }
    );
    return response.data;
  }

  async getTenantFeatureFlag(
    flagKey: string,
    tenantId: string,
    appId: string
  ): Promise<FeatureFlagValueResponse> {
    if (!flagKey || !tenantId || !appId) {
      throw new Error('Flag Key, Tenant ID and App ID are required');
    }

    const query = buildPaginationQuery({ tenantId, appId });
    const response = await this.httpService.get<ApiResponse<FeatureFlagValueResponse>>(
      `/tenant-feature-flags/${flagKey}${query}`,
      { headers: { 'X-Tenant-ID': tenantId }, skipAuth: true }
    );
    return response.data;
  }
}
