import { HttpService } from './HttpService';
import { SessionManager } from './SessionManager';
import type { Subscription, CreateSubscriptionRequest, ApiResponse, TenantSubscriptionFeatures } from '../types/api';

export class SubscriptionApiService {
  constructor(
    private httpService: HttpService,
    private sessionManager?: SessionManager
  ) {}

  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.post<ApiResponse<Subscription>>(
      '/subscriptions/',
      request,
      {
        headers: authHeaders,
      }
    );
    return response.data;
  }

  async getSubscriptionById(id: string): Promise<Subscription> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.get<ApiResponse<Subscription>>(
      `/subscriptions/subscriptions/${id}`,
      {
        headers: authHeaders,
      }
    );
    return response.data;
  }

  async updateSubscription(
    id: string,
    request: Partial<CreateSubscriptionRequest>
  ): Promise<Subscription> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.put<ApiResponse<Subscription>>(
      `/subscriptions/${id}`,
      request,
      {
        headers: authHeaders,
      }
    );
    return response.data;
  }

  async changeSubscriptionPlan(subscriptionId: string, planId: string): Promise<Subscription> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.put<ApiResponse<Subscription>>(
      `/subscriptions/${subscriptionId}/plan`,
      { planId },
      { headers: authHeaders }
    );
    return response.data;
  }

  // Public endpoint - no auth required
  async getTenantSubscriptionFeatures(tenantId: string): Promise<TenantSubscriptionFeatures> {
    const response = await this.httpService.get<ApiResponse<TenantSubscriptionFeatures>>(
      `/subscriptions/tenants/${tenantId}/subscription-features`
    );
    return response.data;
  }

  async processPayment(subscriptionId: string, paymentData: any): Promise<any> {
    if (!this.sessionManager) {
      throw new Error('SessionManager is required for private endpoints');
    }
    const authHeaders = await this.sessionManager.getAuthHeaders();
    const response = await this.httpService.post<ApiResponse<any>>(
      `/subscriptions/${subscriptionId}/process-payment`,
      paymentData,
      { headers: authHeaders }
    );
    return response.data;
  }
}
