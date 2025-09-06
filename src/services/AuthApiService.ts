import { HttpService } from './HttpService';
import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  ChangePasswordRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ApiResponse,
  User,
} from '../types/api';

export class AuthApiService {
  constructor(private httpService: HttpService) {}

  // Public endpoints - no auth required
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await this.httpService.post<LoginResponse>('/auth/login', request);
    console.log(response);
    return response;
  }

  async signup(request: SignupRequest): Promise<User> {
    const response = await this.httpService.post<User>('/auth/signup', request);
    return response;
  }

  async signupTenantAdmin(request: {
    email: string;
    name: string;
    password: string;
    tenantName: string;
    appId: string;
  }): Promise<{ user: User; tenant: any }> {
    const response = await this.httpService.post<{ user: User; tenant: any }>(
      '/auth/signup/tenant-admin',
      request
    );
    return response;
  }

  async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const response = await this.httpService.post<RefreshTokenResponse>('/auth/refresh', request);
    return response;
  }

  async requestPasswordReset(request: { email: string; tenantId: string }): Promise<void> {
    await this.httpService.post<void>('/auth/password-reset/request', request);
  }

  async confirmPasswordReset(request: { token: string; newPassword: string }): Promise<void> {
    await this.httpService.post<void>('/auth/password-reset/confirm', request);
  }

  // Protected endpoints - auth required
  async changePassword(
    request: ChangePasswordRequest,
    authHeaders: Record<string, string>
  ): Promise<void> {
    await this.httpService.post<ApiResponse<null>>('/auth/change-password', request, {
      headers: authHeaders,
    });
  }
}
