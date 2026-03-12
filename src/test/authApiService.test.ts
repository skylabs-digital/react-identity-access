import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthApiService } from '../services/AuthApiService';
import type { HttpService } from '../services/HttpService';
import type { VerifyMagicLinkResponse } from '../types/api';
import { UserType } from '../types/api';

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
      expect(httpService.post).toHaveBeenCalledWith('/auth/magic-link/verify', request);
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
      expect(httpService.post).toHaveBeenCalledWith('/auth/magic-link/verify', request1);
      expect(httpService.post).toHaveBeenCalledWith('/auth/magic-link/verify', request2);
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
});
