import { HttpService } from './HttpService';
import { SessionManager } from './SessionManager';
import type {
  Permission,
  CreatePermissionRequest,
  ApiResponse,
  PaginationParams,
} from '../types/api';

export class PermissionApiService {
  constructor(
    private httpService: HttpService,
    private sessionManager?: SessionManager
  ) {}

  async createPermission(request: CreatePermissionRequest): Promise<Permission> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.post<ApiResponse<Permission>>(
      '/permissions/',
      request,
      {
        headers: authHeaders,
      }
    );
    return response.data;
  }

  async getPermissions(
    params?: PaginationParams
  ): Promise<{ permissions: Permission[]; meta: any }> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `/permissions/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.httpService.get<ApiResponse<Permission[]>>(url, {
      headers: authHeaders,
    });

    return {
      permissions: response.data,
      meta: response.meta,
    };
  }

  async getPermissionById(id: string): Promise<Permission> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.get<ApiResponse<Permission>>(`/permissions/${id}`, {
      headers: authHeaders,
    });
    return response.data;
  }

  async updatePermission(
    id: string,
    request: Partial<CreatePermissionRequest>
  ): Promise<Permission> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.put<ApiResponse<Permission>>(
      `/permissions/${id}`,
      request,
      {
        headers: authHeaders,
      }
    );
    return response.data;
  }

  async deletePermission(id: string): Promise<void> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    await this.httpService.delete<void>(`/permissions/${id}`, {
      headers: authHeaders,
    });
  }

  // Public endpoint - no auth required
  async getAppPermissions(
    appId: string,
    params?: PaginationParams
  ): Promise<{ permissions: Permission[]; meta: any }> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `/permissions/apps/${appId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.httpService.get<ApiResponse<Permission[]>>(url);

    return {
      permissions: response.data,
      meta: response.meta,
    };
  }
}
