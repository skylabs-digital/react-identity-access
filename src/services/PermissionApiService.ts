import { HttpService } from './HttpService';
import type {
  Permission,
  CreatePermissionRequest,
  ApiResponse,
  PaginationParams,
} from '../types/api';
import { buildPaginationQuery } from '../utils/query';

export class PermissionApiService {
  constructor(private httpService: HttpService) {}

  async createPermission(request: CreatePermissionRequest): Promise<Permission> {
    const response = await this.httpService.post<ApiResponse<Permission>>('/permissions/', request);
    return response.data;
  }

  async getPermissions(
    params?: PaginationParams
  ): Promise<{ permissions: Permission[]; meta: any }> {
    const response = await this.httpService.get<ApiResponse<Permission[]>>(
      `/permissions/${buildPaginationQuery(params)}`
    );
    return { permissions: response.data, meta: response.meta };
  }

  async getPermissionById(id: string): Promise<Permission> {
    const response = await this.httpService.get<ApiResponse<Permission>>(`/permissions/${id}`);
    return response.data;
  }

  async updatePermission(
    id: string,
    request: Partial<CreatePermissionRequest>
  ): Promise<Permission> {
    const response = await this.httpService.put<ApiResponse<Permission>>(
      `/permissions/${id}`,
      request
    );
    return response.data;
  }

  async deletePermission(id: string): Promise<void> {
    await this.httpService.delete<void>(`/permissions/${id}`);
  }

  async getAppPermissions(
    appId: string,
    params?: PaginationParams
  ): Promise<{ permissions: Permission[]; meta: any }> {
    const response = await this.httpService.get<ApiResponse<Permission[]>>(
      `/permissions/apps/${appId}${buildPaginationQuery(params)}`,
      { skipAuth: true }
    );
    return { permissions: response.data, meta: response.meta };
  }
}
