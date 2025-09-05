import { HttpService } from './HttpService';
import { SessionManager } from './SessionManager';
import type {
  Tenant,
  CreateTenantRequest,
  PublicTenantInfo,
  ApiResponse,
  PaginationParams,
} from '../types/api';

export class TenantApiService {
  constructor(
    private httpService: HttpService,
    private appId: string,
    private sessionManager?: SessionManager
  ) {}

  async createTenant(request: CreateTenantRequest): Promise<Tenant> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.post<ApiResponse<Tenant>>('/tenants/', request, {
      headers: authHeaders,
    });
    return response.data;
  }

  async getTenants(params?: PaginationParams): Promise<{ tenants: Tenant[]; meta: any }> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `/tenants/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.httpService.get<ApiResponse<Tenant[]>>(url, {
      headers: authHeaders,
    });

    return {
      tenants: response.data,
      meta: response.meta,
    };
  }

  async getTenantById(id: string): Promise<Tenant> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.get<ApiResponse<Tenant>>(`/tenants/${id}`, {
      headers: authHeaders,
    });
    return response.data;
  }

  async updateTenant(id: string, request: Partial<CreateTenantRequest>): Promise<Tenant> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.put<ApiResponse<Tenant>>(`/tenants/${id}`, request, {
      headers: authHeaders,
    });
    return response.data;
  }

  async adminUpdateTenant(id: string, request: Partial<CreateTenantRequest>): Promise<Tenant> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.put<ApiResponse<Tenant>>(
      `/tenants/${id}/admin-update`,
      request,
      {
        headers: authHeaders,
      }
    );
    return response.data;
  }

  // Public endpoint - no auth required
  async getPublicTenantInfo(slug: string): Promise<PublicTenantInfo> {
    const response = await this.httpService.get<ApiResponse<PublicTenantInfo>>(
      `/tenants/${this.appId}/${slug}/public`
    );
    return response.data;
  }
}
