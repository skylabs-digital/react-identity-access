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

interface VerificationCacheEntry {
  promise: Promise<VerifyMagicLinkResponse>;
  timer?: ReturnType<typeof setTimeout>;
}

export class AuthApiService {
  // Caches successful verifyMagicLink results briefly so remounts of the
  // verify route (triggered by the auth state change the first call produces)
  // don't hit the backend a second time with an already-consumed token.
  // On error the entry is dropped immediately so the user's Retry works.
  private verificationCache = new Map<string, VerificationCacheEntry>();
  private readonly VERIFY_CACHE_TTL_MS = 60_000;
  // Prevents duplicate sendMagicLink calls (double-click, StrictMode double-invoke)
  private pendingMagicLinks = new Map<string, Promise<MagicLinkResponse>>();

  constructor(private httpService: HttpService) {}

  // Public endpoints - no auth required.
  // Must pass `{ skipAuth: true }` so HttpService does NOT call
  // SessionManager.getValidAccessToken (which throws when no tokens exist).
  async login(request: LoginRequest): Promise<LoginResponse> {
    return this.httpService.post<LoginResponse>('/auth/login', request, { skipAuth: true });
  }

  async signup(request: SignupRequest): Promise<User> {
    return this.httpService.post<User>('/auth/signup', request, { skipAuth: true });
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
    return this.httpService.post<{ user: User; tenant: any }>(
      '/auth/signup/tenant-admin',
      request,
      { skipAuth: true }
    );
  }

  async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return this.httpService.post<RefreshTokenResponse>('/auth/refresh', request, {
      skipAuth: true,
    });
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
    await this.httpService.post<void>('/auth/password-reset/request', request, { skipAuth: true });
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
      .post<MagicLinkResponse>('/auth/magic-link/send', request, { skipAuth: true })
      .finally(() => {
        this.pendingMagicLinks.delete(key);
      });

    this.pendingMagicLinks.set(key, promise);
    return promise;
  }

  async verifyMagicLink(request: VerifyMagicLinkRequest): Promise<VerifyMagicLinkResponse> {
    const key = request.token;
    const cached = this.verificationCache.get(key);
    if (cached) return cached.promise;

    const promise = this.httpService.post<VerifyMagicLinkResponse>(
      '/auth/magic-link/verify',
      request,
      { skipAuth: true }
    );

    const entry: VerificationCacheEntry = { promise };
    this.verificationCache.set(key, entry);

    promise.then(
      () => {
        entry.timer = setTimeout(
          () => this.verificationCache.delete(key),
          this.VERIFY_CACHE_TTL_MS
        );
      },
      () => {
        this.verificationCache.delete(key);
      }
    );

    return promise;
  }

  async confirmPasswordReset(request: { token: string; newPassword: string }): Promise<void> {
    await this.httpService.post<void>('/auth/password-reset/confirm', request, { skipAuth: true });
  }

  async changePassword(request: ChangePasswordRequest): Promise<void> {
    await this.httpService.post<ApiResponse<null>>('/auth/change-password', request);
  }
}
