import { HttpService } from './HttpService';
import type {
  Subscription,
  CreateSubscriptionRequest,
  ApiResponse,
  TenantSubscriptionFeatures,
} from '../types/api';

export class SubscriptionApiService {
  constructor(private httpService: HttpService) {}

  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    const response = await this.httpService.post<ApiResponse<Subscription>>(
      '/subscriptions/',
      request
    );
    return response.data;
  }

  async getSubscriptionById(id: string): Promise<Subscription> {
    const response = await this.httpService.get<ApiResponse<Subscription>>(
      `/subscriptions/subscriptions/${id}`
    );
    return response.data;
  }

  async updateSubscription(
    id: string,
    request: Partial<CreateSubscriptionRequest>
  ): Promise<Subscription> {
    const response = await this.httpService.put<ApiResponse<Subscription>>(
      `/subscriptions/${id}`,
      request
    );
    return response.data;
  }

  async changeSubscriptionPlan(subscriptionId: string, planId: string): Promise<Subscription> {
    const response = await this.httpService.put<ApiResponse<Subscription>>(
      `/subscriptions/${subscriptionId}/plan`,
      { planId }
    );
    return response.data;
  }

  async getTenantSubscriptionFeatures(tenantId: string): Promise<TenantSubscriptionFeatures> {
    const response = await this.httpService.get<ApiResponse<TenantSubscriptionFeatures>>(
      `/subscriptions/tenants/${tenantId}/subscription-features`,
      { skipAuth: true }
    );
    return response.data;
  }

  async processPayment(subscriptionId: string, paymentData: any): Promise<any> {
    const response = await this.httpService.post<ApiResponse<any>>(
      `/subscriptions/${subscriptionId}/process-payment`,
      paymentData
    );
    return response.data;
  }
}
