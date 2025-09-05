import { HttpService } from './HttpService';
import { SessionManager } from './SessionManager';
import type { User, CreateUserRequest, ApiResponse, PaginationParams } from '../types/api';

export class UserApiService {
  constructor(
    private httpService: HttpService,
    private sessionManager: SessionManager
  ) {}

  async createUser(request: CreateUserRequest): Promise<User> {
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.post<ApiResponse<User>>('/users/', request, {
      headers: authHeaders,
    });
    return response.data;
  }

  async getUsers(params?: PaginationParams): Promise<{ users: User[]; meta: any }> {
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `/users/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.httpService.get<ApiResponse<User[]>>(url, {
      headers: authHeaders,
    });

    return {
      users: response.data,
      meta: response.meta,
    };
  }

  async getUserById(id: string): Promise<User> {
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.get<ApiResponse<User>>(`/users/${id}`, {
      headers: authHeaders,
    });
    return response.data;
  }

  async updateUser(id: string, request: Partial<CreateUserRequest>): Promise<User> {
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.put<ApiResponse<User>>(`/users/${id}`, request, {
      headers: authHeaders,
    });
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    const authHeaders = await this.sessionManager.getAuthHeaders();
    await this.httpService.delete<void>(`/users/${id}`, {
      headers: authHeaders,
    });
  }
}
