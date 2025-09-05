import { HttpService } from './HttpService';

export class HealthApiService {
  constructor(private httpService: HttpService) {}

  // Public endpoint - no auth required
  async checkHealth(): Promise<{ status: string }> {
    return await this.httpService.get<{ status: string }>('/health');
  }
}
