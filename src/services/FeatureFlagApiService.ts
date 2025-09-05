import { HttpService } from './HttpService';
import { SessionManager } from './SessionManager';
import type {
  ApiResponse,
  FeatureFlagItem,
  FeatureFlagValueResponse,
  FeatureFlag,
  CreateFeatureFlagRequest,
  PaginationParams,
} from '../types/api';

export class FeatureFlagApiService {
  constructor(
    private httpService: HttpService,
    private sessionManager?: SessionManager
  ) {}

  async createFeatureFlag(request: CreateFeatureFlagRequest): Promise<FeatureFlag> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.post<ApiResponse<FeatureFlag>>(
      '/feature-flags/',
      request,
      {
        headers: authHeaders,
      }
    );
    return response.data;
  }

  async getFeatureFlags(
    params?: PaginationParams
  ): Promise<{ featureFlags: FeatureFlag[]; meta: any }> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `/feature-flags/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.httpService.get<ApiResponse<FeatureFlag[]>>(url, {
      headers: authHeaders,
    });

    return {
      featureFlags: response.data,
      meta: response.meta,
    };
  }

  async getFeatureFlagById(id: string): Promise<FeatureFlag> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.get<ApiResponse<FeatureFlag>>(`/feature-flags/${id}`, {
      headers: authHeaders,
    });
    return response.data;
  }

  async updateFeatureFlag(
    id: string,
    request: Partial<CreateFeatureFlagRequest>
  ): Promise<FeatureFlag> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.put<ApiResponse<FeatureFlag>>(
      `/feature-flags/${id}`,
      request,
      {
        headers: authHeaders,
      }
    );
    return response.data;
  }

  async deleteFeatureFlag(id: string): Promise<void> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    await this.httpService.delete<void>(`/feature-flags/${id}`, {
      headers: authHeaders,
    });
  }

  // Public endpoint - no auth required
  async getTenantFeatureFlags(
    tenantId: string,
    appId: string,
  ): Promise<FeatureFlagItem[]> {
    if (!tenantId || !appId) {
      throw new Error('Tenant ID and App ID are required');
    }
    
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', tenantId);
    queryParams.append('appId', appId);

    const url = `/tenant-feature-flags${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.httpService.get<ApiResponse<FeatureFlagItem[]>>(url, {
      headers: { 'X-Tenant-ID': tenantId },
    });

    return response.data;
  }

    // Public endpoint - no auth required
    async getTenantFeatureFlag(
      flagKey: string,
      tenantId: string,
      appId: string,
    ): Promise<FeatureFlagValueResponse> {
      if (!flagKey || !tenantId || !appId) {
        throw new Error('Flag Key, Tenant ID and App ID are required');
      }
      
      const queryParams = new URLSearchParams();
      queryParams.append('tenantId', tenantId);
      queryParams.append('appId', appId);
  
      const url = `/tenant-feature-flags/${flagKey}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.httpService.get<ApiResponse<FeatureFlagValueResponse>>(url, {
        headers: { 'X-Tenant-ID': tenantId },
      });
  
      return response.data;
    }
}
