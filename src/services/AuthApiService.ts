import { HttpService } from './HttpService';
import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  ChangePasswordRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  MagicLinkRequest,
  MagicLinkResponse,
  VerifyMagicLinkRequest,
  VerifyMagicLinkResponse,
  ApiResponse,
  User,
  SwitchTenantRequest,
  SwitchTenantResponse,
  UserTenantMembership,
} from '../types/api';

export class AuthApiService {
  // Prevents duplicate verifyMagicLink calls (React StrictMode double-mount)
  private pendingVerifications = new Map<string, Promise<VerifyMagicLinkResponse>>();
  // Prevents duplicate sendMagicLink calls (double-click, StrictMode double-invoke)
  private pendingMagicLinks = new Map<string, Promise<MagicLinkResponse>>();

  constructor(private httpService: HttpService) {}

  // Public endpoints - no auth required
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await this.httpService.post<LoginResponse>('/auth/login', request);
    return response;
  }

  async signup(request: SignupRequest): Promise<User> {
    const response = await this.httpService.post<User>('/auth/signup', request);
    return response;
  }

  async signupTenantAdmin(request: {
    email?: string;
    phoneNumber?: string;
    name: string;
    lastName?: string;
    password: string;
    tenantName: string;
    appId?: string;
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

  async switchTenant(request: SwitchTenantRequest): Promise<SwitchTenantResponse> {
    const response = await this.httpService.post<SwitchTenantResponse>(
      '/auth/switch-tenant',
      request
    );
    return response;
  }

  async getUserTenants(): Promise<UserTenantMembership[]> {
    return this.httpService.get<UserTenantMembership[]>('/auth/tenants');
  }

  async requestPasswordReset(request: { email: string; tenantId: string }): Promise<void> {
    await this.httpService.post<void>('/auth/password-reset/request', request);
  }

  async sendMagicLink(request: MagicLinkRequest): Promise<MagicLinkResponse> {
    const key = JSON.stringify([
      request.email,
      request.tenantId,
      request.appId ?? '',
      request.frontendUrl ?? '',
    ]);
    const pending = this.pendingMagicLinks.get(key);
    if (pending) return pending;

    const promise = this.httpService
      .post<MagicLinkResponse>('/auth/magic-link/send', request)
      .finally(() => {
        this.pendingMagicLinks.delete(key);
      });

    this.pendingMagicLinks.set(key, promise);
    return promise;
  }

  async verifyMagicLink(request: VerifyMagicLinkRequest): Promise<VerifyMagicLinkResponse> {
    const key = request.token;
    const pending = this.pendingVerifications.get(key);
    if (pending) return pending;

    const promise = this.httpService
      .post<VerifyMagicLinkResponse>('/auth/magic-link/verify', request)
      .finally(() => {
        this.pendingVerifications.delete(key);
      });

    this.pendingVerifications.set(key, promise);
    return promise;
  }

  async confirmPasswordReset(request: { token: string; newPassword: string }): Promise<void> {
    await this.httpService.post<void>('/auth/password-reset/confirm', request);
  }

  async changePassword(request: ChangePasswordRequest): Promise<void> {
    await this.httpService.post<ApiResponse<null>>('/auth/change-password', request);
  }
}
