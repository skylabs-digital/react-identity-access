import { HttpService } from './HttpService';
import { SessionManager } from './SessionManager';
import type {
  Role,
  CreateRoleRequest,
  AssignRoleRequest,
  ApiResponse,
  PaginationParams,
} from '../types/api';

export class RoleApiService {
  constructor(
    private httpService: HttpService,
    private sessionManager?: SessionManager
  ) {}

  async createRole(request: CreateRoleRequest): Promise<Role> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.post<ApiResponse<Role>>('/roles/', request, {
      headers: authHeaders,
    });
    return response.data;
  }

  async getRoleById(id: string): Promise<Role> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.get<ApiResponse<Role>>(`/roles/${id}`, {
      headers: authHeaders,
    });
    return response.data;
  }

  async updateRole(id: string, request: Partial<CreateRoleRequest>): Promise<Role> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.put<ApiResponse<Role>>(`/roles/${id}`, request, {
      headers: authHeaders,
    });
    return response.data;
  }

  async deleteRole(id: string): Promise<void> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    await this.httpService.delete<void>(`/roles/${id}`, {
      headers: authHeaders,
    });
  }

  // Public endpoint - no auth required
  async getRolesByApp(
    appId: string,
    params?: PaginationParams
  ): Promise<{ roles: Role[]; meta: any }> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `/roles/app/${appId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.httpService.get<ApiResponse<Role[]>>(url);

    return {
      roles: response.data,
      meta: response.meta,
    };
  }

  async assignRole(roleId: string, request: AssignRoleRequest): Promise<void> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    await this.httpService.post<ApiResponse<null>>(`/roles/${roleId}/assign`, request, {
      headers: authHeaders,
    });
  }

  async revokeRole(roleId: string, request: AssignRoleRequest): Promise<void> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    await this.httpService.post<ApiResponse<null>>(`/roles/${roleId}/revoke`, request, {
      headers: authHeaders,
    });
  }

  async getUserRoles(
    userId: string,
    params?: PaginationParams
  ): Promise<{ roles: Role[]; meta: any }> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `/roles/user/${userId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.httpService.get<ApiResponse<Role[]>>(url, {
      headers: authHeaders,
    });

    return {
      roles: response.data,
      meta: response.meta,
    };
  }
}
