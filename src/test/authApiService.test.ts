import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthApiService } from '../services/AuthApiService';
import type { HttpService } from '../services/HttpService';
import type { MagicLinkResponse, VerifyMagicLinkResponse } from '../types/api';
import { UserType } from '../types/api';

const mockSendMagicLinkResponse: MagicLinkResponse = {
  message: 'sent',
  emailSent: true,
};

const mockVerifyResponse: VerifyMagicLinkResponse = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test',
    isActive: true,
    userType: UserType.USER,
    tenantId: 'tenant-1',
    roleId: 'role-1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-123',
  expiresIn: 3600,
  isNewUser: false,
};

function createMockHttpService(): HttpService {
  return {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setSessionManager: vi.fn(),
    getBaseUrl: vi.fn().mockReturnValue('http://localhost:3000'),
  } as unknown as HttpService;
}

describe('AuthApiService', () => {
  describe('verifyMagicLink — dedup guard', () => {
    let httpService: HttpService;

    beforeEach(() => {
      httpService = createMockHttpService();
    });

    it('should call HTTP POST only once for concurrent calls with same token', async () => {
      // Arrange
      (httpService.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockVerifyResponse);

      const service = new AuthApiService(httpService);
      const request = { token: 'magic-token-1', email: 'test@example.com', appId: 'app-1' };

      // Act — simulate React StrictMode: two concurrent calls with same token
      const [result1, result2] = await Promise.all([
        service.verifyMagicLink(request),
        service.verifyMagicLink(request),
      ]);

      // Assert
      expect(httpService.post).toHaveBeenCalledTimes(1);
      expect(httpService.post).toHaveBeenCalledWith('/auth/magic-link/verify', request, {
        skipAuth: true,
      });
      expect(result1).toEqual(mockVerifyResponse);
      expect(result2).toEqual(mockVerifyResponse);
    });

    it('should resolve to identical results for concurrent calls with same token', async () => {
      // Arrange
      (httpService.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockVerifyResponse);

      const service = new AuthApiService(httpService);
      const request = { token: 'magic-token-2', email: 'test@example.com', appId: 'app-1' };

      // Act
      const [result1, result2] = await Promise.all([
        service.verifyMagicLink(request),
        service.verifyMagicLink(request),
      ]);

      // Assert — both resolve to the same value, only 1 HTTP call
      expect(result1).toStrictEqual(result2);
      expect(result1).toEqual(mockVerifyResponse);
      expect(httpService.post).toHaveBeenCalledTimes(1);
    });

    it('should allow a new call after the first one completes', async () => {
      // Arrange
      (httpService.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockVerifyResponse);

      const service = new AuthApiService(httpService);
      const request = { token: 'magic-token-3', email: 'test@example.com', appId: 'app-1' };

      // Act — first call completes
      await service.verifyMagicLink(request);

      // Second call after completion should trigger a new HTTP request
      await service.verifyMagicLink(request);

      // Assert
      expect(httpService.post).toHaveBeenCalledTimes(2);
    });

    it('should allow concurrent calls with different tokens', async () => {
      // Arrange
      (httpService.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockVerifyResponse);

      const service = new AuthApiService(httpService);
      const request1 = { token: 'token-A', email: 'a@example.com', appId: 'app-1' };
      const request2 = { token: 'token-B', email: 'b@example.com', appId: 'app-1' };

      // Act — two concurrent calls with different tokens
      await Promise.all([service.verifyMagicLink(request1), service.verifyMagicLink(request2)]);

      // Assert — each token triggers its own HTTP call
      expect(httpService.post).toHaveBeenCalledTimes(2);
      expect(httpService.post).toHaveBeenCalledWith('/auth/magic-link/verify', request1, {
        skipAuth: true,
      });
      expect(httpService.post).toHaveBeenCalledWith('/auth/magic-link/verify', request2, {
        skipAuth: true,
      });
    });

    it('should clean up pending map after error and allow retry', async () => {
      // Arrange
      (httpService.post as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('Token already used'))
        .mockResolvedValueOnce(mockVerifyResponse);

      const service = new AuthApiService(httpService);
      const request = { token: 'magic-token-4', email: 'test@example.com', appId: 'app-1' };

      // Act — first call fails
      await expect(service.verifyMagicLink(request)).rejects.toThrow('Token already used');

      // Retry should trigger a new HTTP request (map was cleaned up via .finally)
      const result = await service.verifyMagicLink(request);

      // Assert
      expect(httpService.post).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockVerifyResponse);
    });

    it('should propagate the same error to all concurrent callers', async () => {
      // Arrange
      const error = new Error('Network failure');
      (httpService.post as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      const service = new AuthApiService(httpService);
      const request = { token: 'magic-token-5', email: 'test@example.com', appId: 'app-1' };

      // Act — two concurrent calls, both should get the same error
      const results = await Promise.allSettled([
        service.verifyMagicLink(request),
        service.verifyMagicLink(request),
      ]);

      // Assert — both rejected with same error, only 1 HTTP call
      expect(httpService.post).toHaveBeenCalledTimes(1);
      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('rejected');
      expect((results[0] as PromiseRejectedResult).reason).toBe(error);
      expect((results[1] as PromiseRejectedResult).reason).toBe(error);
    });
  });

  describe('sendMagicLink — dedup guard', () => {
    let httpService: HttpService;

    beforeEach(() => {
      httpService = createMockHttpService();
      (httpService.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockSendMagicLinkResponse);
    });

    it('deduplicates concurrent calls with identical payload', async () => {
      const service = new AuthApiService(httpService);
      const request = {
        email: 'a@example.com',
        tenantId: 't1',
        frontendUrl: 'https://app.example.com',
        appId: 'app-1',
      };

      const [r1, r2, r3] = await Promise.all([
        service.sendMagicLink(request),
        service.sendMagicLink(request),
        service.sendMagicLink(request),
      ]);

      expect(httpService.post).toHaveBeenCalledTimes(1);
      expect(r1).toEqual(r2);
      expect(r2).toEqual(r3);
    });

    it('does not dedup across different emails', async () => {
      const service = new AuthApiService(httpService);
      await Promise.all([
        service.sendMagicLink({ email: 'a@example.com', tenantId: 't', frontendUrl: 'x' }),
        service.sendMagicLink({ email: 'b@example.com', tenantId: 't', frontendUrl: 'x' }),
      ]);
      expect(httpService.post).toHaveBeenCalledTimes(2);
    });

    it('does not dedup across different tenants', async () => {
      const service = new AuthApiService(httpService);
      await Promise.all([
        service.sendMagicLink({ email: 'a@example.com', tenantId: 't1', frontendUrl: 'x' }),
        service.sendMagicLink({ email: 'a@example.com', tenantId: 't2', frontendUrl: 'x' }),
      ]);
      expect(httpService.post).toHaveBeenCalledTimes(2);
    });

    it('allows a new call after the first completes', async () => {
      const service = new AuthApiService(httpService);
      const request = { email: 'a@example.com', tenantId: 't', frontendUrl: 'x' };

      await service.sendMagicLink(request);
      await service.sendMagicLink(request);

      expect(httpService.post).toHaveBeenCalledTimes(2);
    });
  });

  // Regression: d17c7a3 refactor consolidated HttpService so AuthApiService now
  // reuses the authenticated instance. Public endpoints must opt out via
  // `{ skipAuth: true }` or HttpService calls SessionManager.getValidAccessToken()
  // which throws "No tokens available" before the fetch ever runs.
  describe('public endpoints skip auth injection', () => {
    let httpService: HttpService;
    let service: AuthApiService;

    beforeEach(() => {
      httpService = createMockHttpService();
      (httpService.post as ReturnType<typeof vi.fn>).mockResolvedValue({});
      service = new AuthApiService(httpService);
    });

    it('login passes skipAuth: true', async () => {
      await service.login({ username: 'u', password: 'p', appId: 'a', tenantId: 't' });
      expect(httpService.post).toHaveBeenCalledWith('/auth/login', expect.any(Object), {
        skipAuth: true,
      });
    });

    it('signup passes skipAuth: true', async () => {
      await service.signup({
        email: 'a@b.co',
        name: 'N',
        password: 'pwd',
        appId: 'a',
      });
      expect(httpService.post).toHaveBeenCalledWith('/auth/signup', expect.any(Object), {
        skipAuth: true,
      });
    });

    it('signupTenantAdmin passes skipAuth: true', async () => {
      await service.signupTenantAdmin({
        email: 'a@b.co',
        name: 'N',
        password: 'pwd',
        tenantName: 'T',
        appId: 'a',
      });
      expect(httpService.post).toHaveBeenCalledWith(
        '/auth/signup/tenant-admin',
        expect.any(Object),
        { skipAuth: true }
      );
    });

    it('refreshToken passes skipAuth: true', async () => {
      (httpService.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        expiresIn: 3600,
      });
      await service.refreshToken({ refreshToken: 'r' });
      expect(httpService.post).toHaveBeenCalledWith('/auth/refresh', expect.any(Object), {
        skipAuth: true,
      });
    });

    it('requestPasswordReset passes skipAuth: true', async () => {
      await service.requestPasswordReset({ email: 'a@b.co', tenantId: 't' });
      expect(httpService.post).toHaveBeenCalledWith(
        '/auth/password-reset/request',
        expect.any(Object),
        { skipAuth: true }
      );
    });

    it('confirmPasswordReset passes skipAuth: true', async () => {
      await service.confirmPasswordReset({ token: 'tok', newPassword: 'pwd' });
      expect(httpService.post).toHaveBeenCalledWith(
        '/auth/password-reset/confirm',
        expect.any(Object),
        { skipAuth: true }
      );
    });

    it('sendMagicLink passes skipAuth: true', async () => {
      (httpService.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockSendMagicLinkResponse);
      await service.sendMagicLink({
        email: 'a@b.co',
        tenantId: 't',
        frontendUrl: 'https://x',
        appId: 'a',
      });
      expect(httpService.post).toHaveBeenCalledWith('/auth/magic-link/send', expect.any(Object), {
        skipAuth: true,
      });
    });

    it('verifyMagicLink passes skipAuth: true', async () => {
      (httpService.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockVerifyResponse);
      await service.verifyMagicLink({
        token: 'tok',
        email: 'a@b.co',
        appId: 'a',
      });
      expect(httpService.post).toHaveBeenCalledWith('/auth/magic-link/verify', expect.any(Object), {
        skipAuth: true,
      });
    });
  });

  describe('protected endpoints do NOT skip auth', () => {
    let httpService: HttpService;
    let service: AuthApiService;

    beforeEach(() => {
      httpService = createMockHttpService();
      (httpService.post as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (httpService.get as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      service = new AuthApiService(httpService);
    });

    it('changePassword does not pass skipAuth', async () => {
      await service.changePassword({ currentPassword: 'old', newPassword: 'new' });
      const call = (httpService.post as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toBe('/auth/change-password');
      // No third arg, or third arg without skipAuth
      expect(call[2]?.skipAuth).toBeUndefined();
    });

    it('switchTenant does not pass skipAuth', async () => {
      await service.switchTenant({ tenantId: 't', refreshToken: 'r' });
      const call = (httpService.post as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toBe('/auth/switch-tenant');
      expect(call[2]?.skipAuth).toBeUndefined();
    });

    it('getUserTenants does not pass skipAuth', async () => {
      await service.getUserTenants();
      const call = (httpService.get as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toBe('/auth/tenants');
      expect(call[1]?.skipAuth).toBeUndefined();
    });
  });
});
