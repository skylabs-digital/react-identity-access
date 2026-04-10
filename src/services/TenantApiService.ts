import { HttpService } from './HttpService';
import type {
  Tenant,
  CreateTenantRequest,
  PublicTenantInfo,
  TenantSettings,
  UpdateTenantSettingsRequest,
  ApiResponse,
  PaginationParams,
} from '../types/api';
import { buildPaginationQuery } from '../utils/query';

export class TenantApiService {
  constructor(
    private httpService: HttpService,
    private appId?: string
  ) {}

  async createTenant(request: CreateTenantRequest): Promise<Tenant> {
    const response = await this.httpService.post<ApiResponse<Tenant>>('/tenants/', request);
    return response.data;
  }

  async getTenants(params?: PaginationParams): Promise<{ tenants: Tenant[]; meta: any }> {
    const response = await this.httpService.get<ApiResponse<Tenant[]>>(
      `/tenants/${buildPaginationQuery(params)}`
    );
    return { tenants: response.data, meta: response.meta };
  }

  async getTenantById(id: string): Promise<Tenant> {
    const response = await this.httpService.get<ApiResponse<Tenant>>(`/tenants/${id}`);
    return response.data;
  }

  async updateTenant(id: string, request: Partial<CreateTenantRequest>): Promise<Tenant> {
    const response = await this.httpService.put<ApiResponse<Tenant>>(`/tenants/${id}`, request);
    return response.data;
  }

  async adminUpdateTenant(id: string, request: Partial<CreateTenantRequest>): Promise<Tenant> {
    const response = await this.httpService.put<ApiResponse<Tenant>>(
      `/tenants/${id}/admin-update`,
      request
    );
    return response.data;
  }

  async getPublicTenantInfo(slug: string): Promise<PublicTenantInfo> {
    const response = await this.httpService.get<ApiResponse<PublicTenantInfo>>(
      `/tenants/${this.appId}/${slug}/public`,
      { skipAuth: true }
    );
    return response.data;
  }

  async getTenantSettings(id: string): Promise<TenantSettings> {
    const response = await this.httpService.get<ApiResponse<TenantSettings>>(
      `/tenants/${id}/settings`,
      { skipAuth: true }
    );
    return response.data;
  }

  async updateTenantSettings(
    id: string,
    request: UpdateTenantSettingsRequest
  ): Promise<TenantSettings> {
    const response = await this.httpService.put<ApiResponse<TenantSettings>>(
      `/tenants/${id}/settings`,
      request
    );
    return response.data;
  }
}
