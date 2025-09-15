import { HttpService, useApp, useAuth } from 'react-identity-access';
import { useState, useMemo } from 'react';

export default function ApiTest() {
  const { tenantSlug, appId, baseUrl } = useApp();
  const { sessionManager, hasValidSession, authenticatedHttpService } = useAuth();
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState<any>(false);
  const [error, setError] = useState<any>(null);

  // Create a public HTTP service (no authentication)
  const publicHttpService = useMemo(() => {
    return new HttpService(baseUrl);
  }, [baseUrl]);

  const testPublicEndpoint = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await publicHttpService.get('/health');
      setApiResponse({ endpoint: '/health (public)', data: response });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testProtectedEndpoint = async () => {
    if (!hasValidSession()) {
      setError('No valid session. Please login first.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Use authenticated HttpService - no need for manual auth headers
      const response = await authenticatedHttpService.get('/users/me');
      setApiResponse({ endpoint: '/users/me (protected)', data: response });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testTokenRefresh = async () => {
    if (!hasValidSession()) {
      setError('No valid session. Please login first.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await sessionManager.getAccessToken();
      setApiResponse({
        endpoint: 'Token Refresh Test',
        data: {
          message: 'Token retrieved successfully',
          tokenPreview: `${token?.substring(0, 20)}...`,
          hasValidSession: hasValidSession(),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Token refresh failed');
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      // Mock login test - in real scenario this would use actual credentials
      const mockTokens = {
        accessToken: 'mock_access_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        expiresIn: 3600,
      };

      sessionManager.setTokens(mockTokens);
      setApiResponse({
        endpoint: 'Mock Login Test',
        data: {
          message: 'Mock tokens set successfully',
          hasValidSession: hasValidSession(),
          tokenPreview: mockTokens.accessToken.substring(0, 20) + '...',
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login test failed');
    } finally {
      setLoading(false);
    }
  };

  const testLogout = async () => {
    setLoading(true);
    setError(null);
    try {
      sessionManager.clearSession();
      setApiResponse({
        endpoint: 'Logout Test',
        data: {
          message: 'Session cleared successfully',
          hasValidSession: hasValidSession(),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout test failed');
    } finally {
      setLoading(false);
    }
  };

  const testAppContext = async () => {
    setLoading(true);
    setError(null);
    try {
      setApiResponse({
        endpoint: 'App Context Test',
        data: {
          message: 'App context retrieved successfully',
          hasPublicHttpService: !!publicHttpService,
          hasauthenticatedHttpService: !!authenticatedHttpService,
          publicHttpServiceType: publicHttpService.constructor.name,
          authenticatedHttpServiceType: authenticatedHttpService.constructor.name,
          tenantSlug,
          appId,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'App context test failed');
    } finally {
      setLoading(false);
    }
  };

  const testTenantPersistence = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current tenant from context
      const currentTenant = tenantSlug;

      // Check localStorage
      const storedTenant = localStorage.getItem('tenant');

      if (currentTenant && storedTenant === currentTenant) {
        setApiResponse({
          endpoint: 'Tenant Persistence Test',
          data: {
            message: `✅ Tenant persistence working! Current: ${currentTenant}, Stored: ${storedTenant}`,
            currentTenant,
            storedTenant,
            status: 'success',
          },
        });
      } else {
        setApiResponse({
          endpoint: 'Tenant Persistence Test',
          data: {
            message: `❌ Tenant persistence issue. Current: ${currentTenant}, Stored: ${storedTenant}`,
            currentTenant,
            storedTenant,
            status: 'error',
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testRefreshQueue = async () => {
    setLoading(true);
    setError(null);

    try {
      // First, set up mock tokens that will be "expired"
      const mockTokens = {
        accessToken: 'mock_expired_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        expiresIn: -1, // Already expired
      };

      sessionManager.setTokens(mockTokens);

      // Test automatic retry with authenticated HttpService
      const startTime = Date.now();
      const promises = Array.from({ length: 3 }, async (_, i) => {
        try {
          // This should automatically handle token refresh and retry
          const response = await authenticatedHttpService.get('/users/me');
          return {
            requestId: i,
            success: true,
            hasResponse: !!response,
            timestamp: Date.now() - startTime,
          };
        } catch (error) {
          return {
            requestId: i,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now() - startTime,
          };
        }
      });

      const results = await Promise.all(promises);

      setApiResponse({
        endpoint: 'Authenticated HttpService Test',
        data: {
          message: `✅ Authenticated HttpService test completed. Made ${promises.length} concurrent protected requests.`,
          results,
          totalTime: Date.now() - startTime,
          successCount: results.filter(r => r.success).length,
          errorCount: results.filter(r => !r.success).length,
          note: 'This tests automatic token refresh and retry functionality',
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setApiResponse(null);
    setError(null);
  };

  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
      }}
    >
      <h2>API Test Suite</h2>

      <div style={{ marginBottom: '15px' }}>
        <h3>Session Status</h3>
        <p>
          <strong>Has Valid Session:</strong> {hasValidSession() ? '✅ Yes' : '❌ No'}
        </p>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h3>API Tests</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <button
            onClick={testAppContext}
            disabled={loading}
            style={{
              padding: '8px 15px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Test App Context
          </button>
          <button
            onClick={testTenantPersistence}
            disabled={loading}
            style={{
              padding: '8px 15px',
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Test Tenant Persistence
          </button>
          <button
            onClick={testLogin}
            disabled={loading}
            style={{
              padding: '8px 15px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Mock Login
          </button>
          <button
            onClick={testLogout}
            disabled={loading}
            style={{
              padding: '8px 15px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Test Logout
          </button>
          <button
            onClick={testPublicEndpoint}
            disabled={loading}
            style={{
              padding: '8px 15px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Test Public API
          </button>
          <button
            onClick={testProtectedEndpoint}
            disabled={loading || !hasValidSession()}
            style={{
              padding: '8px 15px',
              backgroundColor: hasValidSession() ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !hasValidSession() ? 'not-allowed' : 'pointer',
            }}
          >
            Test Protected API
          </button>
          <button
            onClick={testTokenRefresh}
            disabled={loading || !hasValidSession()}
            style={{
              padding: '8px 15px',
              backgroundColor: hasValidSession() ? '#ffc107' : '#6c757d',
              color: hasValidSession() ? 'black' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !hasValidSession() ? 'not-allowed' : 'pointer',
            }}
          >
            Test Token Refresh
          </button>
          <button
            onClick={testRefreshQueue}
            disabled={loading}
            style={{
              padding: '8px 15px',
              backgroundColor: '#fd7e14',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Test Auth HttpService
          </button>
          <button
            onClick={clearResults}
            style={{
              padding: '8px 15px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Clear Results
          </button>
        </div>
      </div>

      <div>
        <h3>Results</h3>
        {loading && <p>Loading...</p>}
        {error && (
          <div
            style={{
              color: 'red',
              backgroundColor: '#f8d7da',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '10px',
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}
        {apiResponse && (
          <div
            style={{
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '4px',
              border: '1px solid #ddd',
            }}
          >
            <h4>{apiResponse.endpoint}</h4>
            <pre
              style={{
                backgroundColor: '#f8f9fa',
                padding: '10px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px',
              }}
            >
              {JSON.stringify(apiResponse.data, null, 2)}
            </pre>
          </div>
        )}
        {!apiResponse && !loading && !error && (
          <p style={{ color: '#666' }}>Click a test button to see results</p>
        )}
      </div>
    </div>
  );
}
