import { HttpService } from './HttpService';
import type {
  Role,
  CreateRoleRequest,
  AssignRoleRequest,
  ApiResponse,
  PaginationParams,
} from '../types/api';
import { buildPaginationQuery } from '../utils/query';

export class RoleApiService {
  constructor(private httpService: HttpService) {}

  async createRole(request: CreateRoleRequest): Promise<Role> {
    const response = await this.httpService.post<ApiResponse<Role>>('/roles/', request);
    return response.data;
  }

  async getRoleById(id: string): Promise<Role> {
    const response = await this.httpService.get<ApiResponse<Role>>(`/roles/${id}`);
    return response.data;
  }

  async updateRole(id: string, request: Partial<CreateRoleRequest>): Promise<Role> {
    const response = await this.httpService.put<ApiResponse<Role>>(`/roles/${id}`, request);
    return response.data;
  }

  async deleteRole(id: string): Promise<void> {
    await this.httpService.delete<void>(`/roles/${id}`);
  }

  async getRolesByApp(
    appId: string,
    params?: PaginationParams
  ): Promise<{ roles: Role[]; meta: any }> {
    const response = await this.httpService.get<ApiResponse<Role[]>>(
      `/roles/app/${appId}${buildPaginationQuery(params)}`,
      { skipAuth: true }
    );
    return { roles: response.data, meta: response.meta };
  }

  async assignRole(roleId: string, request: AssignRoleRequest): Promise<void> {
    await this.httpService.post<ApiResponse<null>>(`/roles/${roleId}/assign`, request);
  }

  async revokeRole(roleId: string, request: AssignRoleRequest): Promise<void> {
    await this.httpService.post<ApiResponse<null>>(`/roles/${roleId}/revoke`, request);
  }

  async getUserRoles(
    userId: string,
    params?: PaginationParams
  ): Promise<{ roles: Role[]; meta: any }> {
    const response = await this.httpService.get<ApiResponse<Role[]>>(
      `/roles/user/${userId}${buildPaginationQuery(params)}`
    );
    return { roles: response.data, meta: response.meta };
  }
}
