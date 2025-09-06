import React from 'react';
import { SubscriptionGuard, useSubscription } from 'react-identity-access';

const SubscriptionDemo: React.FC = () => {
  const {
    subscription,
    features,
    isFeatureEnabled,
    getFeatureValue,
    hasAllowedPlan,
    loading,
    error,
  } = useSubscription();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">Loading subscription data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Error loading subscription: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 flex items-center">
            <span className="mr-3">💳</span>
            Subscription Demo
          </h1>

          {/* Current Subscription Info */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Subscription</h2>
            {subscription ? (
              <div className="grid gap-3 text-sm">
                <div className="flex items-center">
                  <span className="font-medium text-gray-700 w-20">Plan:</span>
                  <span className="text-gray-900">
                    {subscription.planName} ({subscription.planId})
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium text-gray-700 w-20">Status:</span>
                  <span
                    className={`font-semibold ml-2 ${
                      subscription.isActive ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {subscription.subscriptionStatus}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium text-gray-700 w-20">Tenant:</span>
                  <span className="text-gray-900">{subscription.tenantId}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium text-gray-700 w-20">Features:</span>
                  <span className="text-gray-900">{features.length} available</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No subscription data available</p>
            )}
          </div>

          {/* Plan Features */}
          <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Available Features</h3>
            {features.length > 0 ? (
              <div className="grid gap-3">
                {features.map(feature => (
                  <div key={feature.key} className="bg-white p-4 rounded-lg border border-blue-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">
                          {feature.name} ({feature.key})
                        </div>
                        {feature.description && (
                          <div className="text-xs text-gray-500 mt-1">{feature.description}</div>
                        )}
                      </div>
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          feature.type === 'BOOLEAN' || feature.type === 'boolean'
                            ? feature.value
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {feature.type}: {String(feature.value)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No features available</p>
            )}
          </div>

          {/* Subscription Guards Demo */}
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-2">🔒</span>
            Subscription Guards Demo
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Basic Plan Guard */}
            <SubscriptionGuard allowedPlans={['basic']}>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-2 flex items-center">
                  <span className="mr-2">✅</span>
                  Basic Plan Feature
                </h3>
                <p className="text-sm text-green-700">
                  This content is only visible to users with the "basic" plan.
                </p>
              </div>
            </SubscriptionGuard>

            {/* Premium/Enterprise Plans Guard */}
            <SubscriptionGuard allowedPlans={['premium', 'enterprise']}>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2 flex items-center">
                  <span className="mr-2">⭐</span>
                  Premium/Enterprise Feature
                </h3>
                <p className="text-sm text-yellow-700">
                  This content is visible to users with "premium" OR "enterprise" plans.
                </p>
              </div>
            </SubscriptionGuard>

            {/* Feature-based Guard */}
            <SubscriptionGuard requiredFeature="advanced_analytics">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-purple-800 mb-2 flex items-center">
                  <span className="mr-2">📊</span>
                  Advanced Analytics
                </h3>
                <p className="text-sm text-purple-700">
                  This content requires the "advanced_analytics" feature to be enabled.
                </p>
              </div>
            </SubscriptionGuard>

            {/* Multiple Plans Guard */}
            <SubscriptionGuard allowedPlans={['starter', 'business', 'enterprise']}>
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-pink-800 mb-2 flex items-center">
                  <span className="mr-2">🚀</span>
                  Multi-Plan Feature
                </h3>
                <p className="text-sm text-pink-700">
                  Available to starter, business, or enterprise plans.
                </p>
              </div>
            </SubscriptionGuard>
          </div>

          {/* Programmatic Usage Examples */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <span className="mr-2">🔧</span>
              Programmatic Usage
            </h3>
            <div className="grid gap-2 text-sm font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">hasAllowedPlan(['premium', 'enterprise']):</span>
                <span
                  className={`font-semibold ${
                    hasAllowedPlan(['premium', 'enterprise']) ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {String(hasAllowedPlan(['premium', 'enterprise']))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">isFeatureEnabled('advanced_analytics'):</span>
                <span
                  className={`font-semibold ${
                    isFeatureEnabled('advanced_analytics') ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {String(isFeatureEnabled('advanced_analytics'))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">getFeatureValue('max_users', 10):</span>
                <span className="text-blue-600 font-semibold">
                  {String(getFeatureValue('max_users', 10))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">getFeatureValue('api_calls_limit', 1000):</span>
                <span className="text-blue-600 font-semibold">
                  {String(getFeatureValue('api_calls_limit', 1000))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDemo;
