import { HttpService } from './HttpService';
import { SessionManager } from './SessionManager';
import type {
  SubscriptionPlan,
  CreateSubscriptionPlanRequest,
  ApiResponse,
  PaginationParams,
} from '../types/api';

export class SubscriptionPlanApiService {
  constructor(
    private httpService: HttpService,
    private sessionManager: SessionManager
  ) {}

  async createSubscriptionPlan(request: CreateSubscriptionPlanRequest): Promise<SubscriptionPlan> {
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.post<ApiResponse<SubscriptionPlan>>(
      '/subscription-plans/',
      request,
      {
        headers: authHeaders,
      }
    );
    return response.data;
  }

  async getSubscriptionPlans(
    params?: PaginationParams & { appId?: string }
  ): Promise<{ plans: SubscriptionPlan[]; meta: any }> {
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.appId) queryParams.append('appId', params.appId);

    const url = `/subscription-plans/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.httpService.get<ApiResponse<SubscriptionPlan[]>>(url, {
      headers: authHeaders,
    });

    return {
      plans: response.data,
      meta: response.meta,
    };
  }

  async getSubscriptionPlanById(id: string): Promise<SubscriptionPlan> {
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.get<ApiResponse<SubscriptionPlan>>(
      `/subscription-plans/${id}`,
      {
        headers: authHeaders,
      }
    );
    return response.data;
  }

  async updateSubscriptionPlan(
    id: string,
    request: Partial<CreateSubscriptionPlanRequest>
  ): Promise<SubscriptionPlan> {
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.put<ApiResponse<SubscriptionPlan>>(
      `/subscription-plans/${id}`,
      request,
      {
        headers: authHeaders,
      }
    );
    return response.data;
  }

  async deleteSubscriptionPlan(id: string): Promise<void> {
    const authHeaders = await this.sessionManager.getAuthHeaders();
    await this.httpService.delete<void>(`/subscription-plans/${id}`, {
      headers: authHeaders,
    });
  }
}
