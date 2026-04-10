import { HttpService } from './HttpService';
import type {
  SubscriptionPlan,
  CreateSubscriptionPlanRequest,
  ApiResponse,
  PaginationParams,
} from '../types/api';
import { buildPaginationQuery } from '../utils/query';

export class SubscriptionPlanApiService {
  constructor(private httpService: HttpService) {}

  async createSubscriptionPlan(request: CreateSubscriptionPlanRequest): Promise<SubscriptionPlan> {
    const response = await this.httpService.post<ApiResponse<SubscriptionPlan>>(
      '/subscription-plans/',
      request
    );
    return response.data;
  }

  async getSubscriptionPlans(
    params?: PaginationParams & { appId?: string }
  ): Promise<{ plans: SubscriptionPlan[]; meta: any }> {
    const response = await this.httpService.get<ApiResponse<SubscriptionPlan[]>>(
      `/subscription-plans/${buildPaginationQuery(params)}`
    );
    return { plans: response.data, meta: response.meta };
  }

  async getSubscriptionPlanById(id: string): Promise<SubscriptionPlan> {
    const response = await this.httpService.get<ApiResponse<SubscriptionPlan>>(
      `/subscription-plans/${id}`
    );
    return response.data;
  }

  async updateSubscriptionPlan(
    id: string,
    request: Partial<CreateSubscriptionPlanRequest>
  ): Promise<SubscriptionPlan> {
    const response = await this.httpService.put<ApiResponse<SubscriptionPlan>>(
      `/subscription-plans/${id}`,
      request
    );
    return response.data;
  }

  async deleteSubscriptionPlan(id: string): Promise<void> {
    await this.httpService.delete<void>(`/subscription-plans/${id}`);
  }
}
