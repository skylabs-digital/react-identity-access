import { HttpService } from './HttpService';
import type { User, CreateUserRequest, ApiResponse, PaginationParams } from '../types/api';
import { buildPaginationQuery } from '../utils/query';

export class UserApiService {
  constructor(private httpService: HttpService) {}

  async createUser(request: CreateUserRequest): Promise<User> {
    const response = await this.httpService.post<ApiResponse<User>>('/users/', request);
    return response.data;
  }

  async getUsers(params?: PaginationParams): Promise<{ users: User[]; meta: any }> {
    const response = await this.httpService.get<ApiResponse<User[]>>(
      `/users/${buildPaginationQuery(params)}`
    );
    return { users: response.data, meta: response.meta };
  }

  async getUserById(id: string): Promise<User> {
    const response = await this.httpService.get<ApiResponse<User>>(`/users/${id}`);
    return response.data;
  }

  async updateUser(id: string, request: Partial<CreateUserRequest>): Promise<User> {
    const response = await this.httpService.put<ApiResponse<User>>(`/users/${id}`, request);
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await this.httpService.delete<void>(`/users/${id}`);
  }
}
