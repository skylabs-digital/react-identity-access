import { BasePaymentGateway } from '../base/PaymentGateway';
import {
  PaymentIntent,
  PaymentResult,
  PaymentMethod,
  Customer,
  Subscription,
  Invoice,
} from '../../types';

export class StripeGateway extends BasePaymentGateway {
  name = 'stripe';

  protected async doInitialize(config: Record<string, any>): Promise<void> {
    const { publishableKey, secretKey: _secretKey } = config;

    if (!publishableKey) {
      throw new Error('Stripe publishable key is required');
    }

    // In a real implementation, you would load the Stripe SDK
    // For now, we'll simulate the initialization
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentIntent> {
    this.ensureInitialized();
    this.validateAmount(amount);
    this.validateCurrency(currency);

    // Mock Stripe payment intent creation
    const paymentIntent: PaymentIntent = {
      id: this.generateId(),
      amount,
      currency: currency.toLowerCase(),
      status: 'requires_payment_method',
      clientSecret: `pi_${this.generateId()}_secret_${Math.random().toString(36)}`,
      metadata,
    };

    return paymentIntent;
  }

  async confirmPayment(paymentIntentId: string, _paymentMethodId: string): Promise<PaymentResult> {
    this.ensureInitialized();

    // Mock payment confirmation
    const success = Math.random() > 0.1; // 90% success rate for demo

    const paymentIntent: PaymentIntent = {
      id: paymentIntentId,
      amount: 1000, // Mock amount
      currency: 'usd',
      status: success ? 'succeeded' : 'requires_action',
      clientSecret: `pi_${paymentIntentId}_secret`,
    };

    return {
      success,
      paymentIntent,
      error: success ? undefined : 'Payment requires additional authentication',
    };
  }

  async createCustomer(_customer: Omit<Customer, 'id' | 'paymentMethods'>): Promise<string> {
    this.ensureInitialized();

    // Mock customer creation
    return `cus_${this.generateId()}`;
  }

  async addPaymentMethod(_customerId: string, paymentMethodData: any): Promise<PaymentMethod> {
    this.ensureInitialized();

    // Mock payment method creation
    const paymentMethod: PaymentMethod = {
      id: `pm_${this.generateId()}`,
      type: paymentMethodData.type || 'card',
      provider: 'stripe',
      last4: paymentMethodData.card?.last4 || '4242',
      brand: paymentMethodData.card?.brand || 'visa',
      expiryMonth: paymentMethodData.card?.exp_month || 12,
      expiryYear: paymentMethodData.card?.exp_year || 2025,
      isDefault: paymentMethodData.isDefault || false,
      metadata: paymentMethodData.metadata,
    };

    return paymentMethod;
  }

  async removePaymentMethod(paymentMethodId: string): Promise<void> {
    this.ensureInitialized();
    // Mock payment method removal
    console.log(`Removing Stripe payment method: ${paymentMethodId}`);
  }

  async createSubscription(_customerId: string, planId: string): Promise<Subscription> {
    this.ensureInitialized();

    // Mock subscription creation
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const subscription: Subscription = {
      id: `sub_${this.generateId()}`,
      tenantId: 'mock-tenant',
      planId,
      plan: {
        id: planId,
        name: 'Mock Plan',
        displayName: 'Mock Plan',
        description: 'A mock subscription plan',
        price: 2999,
        currency: 'USD',
        interval: 'monthly',
        features: ['feature1', 'feature2'],
        limits: { users: 10, storage: 1000 },
        isActive: true,
      },
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    };

    return subscription;
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    this.ensureInitialized();
    // Mock subscription cancellation
    console.log(`Canceling Stripe subscription: ${subscriptionId}`);
  }

  async getInvoices(_customerId: string): Promise<Invoice[]> {
    this.ensureInitialized();

    // Mock invoice retrieval
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    return [
      {
        id: `in_${this.generateId()}`,
        tenantId: 'mock-tenant',
        subscriptionId: `sub_${this.generateId()}`,
        amount: 2999,
        currency: 'USD',
        status: 'paid',
        dueDate: now,
        paidAt: now,
        invoiceUrl: 'https://invoice.stripe.com/mock',
        downloadUrl: 'https://invoice.stripe.com/mock/pdf',
        items: [
          {
            id: 'item_1',
            description: 'Monthly subscription',
            quantity: 1,
            unitPrice: 2999,
            amount: 2999,
          },
        ],
        createdAt: lastMonth,
      },
    ];
  }
}
