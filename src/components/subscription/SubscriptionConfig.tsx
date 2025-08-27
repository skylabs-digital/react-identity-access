import { useState } from 'react';
import { useSubscription } from '../../hooks/useSubscription';

export interface SubscriptionConfigProps {
  onPlanChange?: (planId: string) => void;
  onPaymentMethodChange?: (paymentMethodId: string) => void;
  className?: string;
}

export function SubscriptionConfig({
  onPlanChange,
  onPaymentMethodChange,
  className = '',
}: SubscriptionConfigProps) {
  const {
    subscription,
    plans,
    paymentMethods,
    isLoading,
    error,
    subscribe,
    cancelSubscription,
    updatePaymentMethod,
    canUpgrade,
    canDowngrade,
    daysUntilExpiry,
    isTrialing,
  } = useSubscription();

  const [_selectedPlan, _setSelectedPlan] = useState(subscription?.plan?.id || '');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    paymentMethods.find(pm => pm.isDefault)?.id || ''
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePlanChange = async (planId: string) => {
    if (planId === subscription?.plan?.id) return;

    setIsUpdating(true);
    try {
      await subscribe(planId, selectedPaymentMethod);
      onPlanChange?.(planId);
    } catch (error) {
      console.error('Failed to change plan:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentMethodChange = async (paymentMethodId: string) => {
    if (!subscription || paymentMethodId === selectedPaymentMethod) return;

    setIsUpdating(true);
    try {
      await updatePaymentMethod(paymentMethodId);
      setSelectedPaymentMethod(paymentMethodId);
      onPaymentMethodChange?.(paymentMethodId);
    } catch (error) {
      console.error('Failed to update payment method:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.'
    );

    if (!confirmed) return;

    setIsUpdating(true);
    try {
      await cancelSubscription();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`subscription-config loading ${className}`}>Loading subscription...</div>
    );
  }

  if (error) {
    return <div className={`subscription-config error ${className}`}>Error: {error}</div>;
  }

  return (
    <div className={`subscription-config ${className}`}>
      {/* Current Subscription Status */}
      {subscription && (
        <div className="current-subscription">
          <h3>Current Subscription</h3>
          <div className="subscription-details">
            <p>
              <strong>Plan:</strong> {subscription.plan.displayName}
            </p>
            <p>
              <strong>Status:</strong> {subscription.status}
            </p>
            <p>
              <strong>Price:</strong> ${subscription.plan.price / 100}/{subscription.plan.interval}
            </p>
            {isTrialing && (
              <p className="trial-notice">
                <strong>Trial:</strong> {daysUntilExpiry} days remaining
              </p>
            )}
            {!isTrialing && daysUntilExpiry !== null && (
              <p>
                <strong>Next billing:</strong> {daysUntilExpiry} days
              </p>
            )}
            {subscription.cancelAtPeriodEnd && (
              <p className="cancel-notice">
                <strong>Canceling:</strong> Access ends in {daysUntilExpiry} days
              </p>
            )}
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="available-plans">
        <h3>Available Plans</h3>
        <div className="plans-grid">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`plan-card ${plan.id === subscription?.plan?.id ? 'current' : ''}`}
            >
              <h4>{plan.displayName}</h4>
              <p className="plan-price">
                ${plan.price / 100}/{plan.interval}
              </p>
              <p className="plan-description">{plan.description}</p>

              <ul className="plan-features">
                {plan.features.map((feature: string) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <div className="plan-limits">
                {Object.entries(plan.limits).map(([key, value]) => (
                  <span key={key} className="limit-badge">
                    {key}: {String(value)}
                  </span>
                ))}
              </div>

              {plan.id !== subscription?.plan?.id && (
                <button
                  onClick={() => handlePlanChange(plan.id)}
                  disabled={isUpdating}
                  className={`plan-button ${
                    subscription && canUpgrade(plan.id)
                      ? 'upgrade'
                      : subscription && canDowngrade(plan.id)
                        ? 'downgrade'
                        : 'subscribe'
                  }`}
                >
                  {isUpdating
                    ? 'Updating...'
                    : !subscription
                      ? 'Subscribe'
                      : canUpgrade(plan.id)
                        ? 'Upgrade'
                        : 'Downgrade'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      {subscription && paymentMethods.length > 0 && (
        <div className="payment-methods">
          <h3>Payment Methods</h3>
          <div className="payment-methods-list">
            {paymentMethods.map(pm => (
              <div key={pm.id} className={`payment-method ${pm.isDefault ? 'default' : ''}`}>
                <div className="payment-method-info">
                  <span className="card-brand">{pm.brand?.toUpperCase()}</span>
                  <span className="card-last4">•••• {pm.last4}</span>
                  <span className="card-expiry">
                    {pm.expiryMonth}/{pm.expiryYear}
                  </span>
                  {pm.isDefault && <span className="default-badge">Default</span>}
                </div>
                {!pm.isDefault && (
                  <button
                    onClick={() => handlePaymentMethodChange(pm.id)}
                    disabled={isUpdating}
                    className="set-default-button"
                  >
                    Set as Default
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Subscription */}
      {subscription && subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
        <div className="cancel-section">
          <button
            onClick={handleCancelSubscription}
            disabled={isUpdating}
            className="cancel-button"
          >
            {isUpdating ? 'Canceling...' : 'Cancel Subscription'}
          </button>
          <p className="cancel-note">
            You'll keep access to premium features until the end of your billing period.
          </p>
        </div>
      )}
    </div>
  );
}
