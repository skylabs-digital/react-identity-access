import { BasePaymentGateway } from '../base/PaymentGateway';
import {
  PaymentIntent,
  PaymentResult,
  PaymentMethod,
  Customer,
  Subscription,
  Invoice,
} from '../../types';

export class MercadoPagoGateway extends BasePaymentGateway {
  name = 'mercadopago';

  protected async doInitialize(config: Record<string, any>): Promise<void> {
    const { publicKey, accessToken } = config;

    if (!publicKey || !accessToken) {
      throw new Error('MercadoPago public key and access token are required');
    }

    // In a real implementation, you would load the MercadoPago SDK
    // For now, we'll simulate the initialization
    // Store config for future use: { publicKey, accessToken }
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentIntent> {
    this.ensureInitialized();
    this.validateAmount(amount);
    this.validateCurrency(currency);

    // Mock MercadoPago payment intent creation
    const paymentIntent: PaymentIntent = {
      id: this.generateId(),
      amount,
      currency: currency.toLowerCase(),
      status: 'requires_payment_method',
      clientSecret: `mp_${this.generateId()}_secret_${Math.random().toString(36)}`,
      metadata,
    };

    return paymentIntent;
  }

  async confirmPayment(paymentIntentId: string, _paymentMethodId: string): Promise<PaymentResult> {
    this.ensureInitialized();

    // Mock payment confirmation
    const success = Math.random() > 0.15; // 85% success rate for demo

    const paymentIntent: PaymentIntent = {
      id: paymentIntentId,
      amount: 1000, // Mock amount
      currency: 'ars',
      status: success ? 'succeeded' : 'requires_action',
      clientSecret: `mp_${paymentIntentId}_secret`,
    };

    return {
      success,
      paymentIntent,
      error: success ? undefined : 'Payment requires additional verification',
    };
  }

  async createCustomer(_customer: Omit<Customer, 'id' | 'paymentMethods'>): Promise<string> {
    this.ensureInitialized();

    // Mock customer creation
    return `mp_cus_${this.generateId()}`;
  }

  async addPaymentMethod(_customerId: string, paymentMethodData: any): Promise<PaymentMethod> {
    this.ensureInitialized();

    // Mock payment method creation
    const paymentMethod: PaymentMethod = {
      id: `mp_pm_${this.generateId()}`,
      type: paymentMethodData.type || 'card',
      provider: 'mercadopago',
      last4: paymentMethodData.card?.last4 || '1234',
      brand: paymentMethodData.card?.brand || 'mastercard',
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
    console.log(`Removing MercadoPago payment method: ${paymentMethodId}`);
  }

  async createSubscription(_customerId: string, planId: string): Promise<Subscription> {
    this.ensureInitialized();

    // Mock subscription creation
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const subscription: Subscription = {
      id: `mp_sub_${this.generateId()}`,
      tenantId: 'mock-tenant',
      planId,
      plan: {
        id: planId,
        name: 'Plan Mock',
        displayName: 'Plan Mock',
        description: 'Un plan de suscripción mock',
        price: 4999,
        currency: 'ARS',
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
    console.log(`Canceling MercadoPago subscription: ${subscriptionId}`);
  }

  async getInvoices(_customerId: string): Promise<Invoice[]> {
    this.ensureInitialized();

    // Mock invoice retrieval
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    return [
      {
        id: `mp_in_${this.generateId()}`,
        tenantId: 'mock-tenant',
        subscriptionId: `mp_sub_${this.generateId()}`,
        amount: 4999,
        currency: 'ARS',
        status: 'paid',
        dueDate: now,
        paidAt: now,
        invoiceUrl: 'https://mercadopago.com.ar/invoice/mock',
        downloadUrl: 'https://mercadopago.com.ar/invoice/mock/pdf',
        items: [
          {
            id: 'item_1',
            description: 'Suscripción mensual',
            quantity: 1,
            unitPrice: 4999,
            amount: 4999,
          },
        ],
        createdAt: lastMonth,
      },
    ];
  }
}
