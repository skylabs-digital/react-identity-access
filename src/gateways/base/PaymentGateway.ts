import {
  PaymentGateway,
  PaymentIntent,
  PaymentResult,
  PaymentMethod,
  Customer,
  Subscription,
  Invoice,
} from '../../types';

export abstract class BasePaymentGateway implements PaymentGateway {
  abstract name: string;
  protected config: Record<string, any> = {};
  protected initialized = false;

  async initialize(config: Record<string, any>): Promise<void> {
    this.config = config;
    await this.doInitialize(config);
    this.initialized = true;
  }

  protected abstract doInitialize(config: Record<string, any>): Promise<void>;

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`${this.name} gateway not initialized`);
    }
  }

  abstract createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentIntent>;

  abstract confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<PaymentResult>;

  abstract createCustomer(customer: Omit<Customer, 'id' | 'paymentMethods'>): Promise<string>;

  abstract addPaymentMethod(customerId: string, paymentMethodData: any): Promise<PaymentMethod>;

  abstract removePaymentMethod(paymentMethodId: string): Promise<void>;

  abstract createSubscription(customerId: string, planId: string): Promise<Subscription>;

  abstract cancelSubscription(subscriptionId: string): Promise<void>;

  abstract getInvoices(customerId: string): Promise<Invoice[]>;

  // Helper methods that can be overridden
  protected generateId(): string {
    return `${this.name.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
  }

  protected validateCurrency(currency: string): void {
    const supportedCurrencies = ['USD', 'EUR', 'ARS', 'BRL', 'MXN'];
    if (!supportedCurrencies.includes(currency.toUpperCase())) {
      throw new Error(`Currency ${currency} not supported`);
    }
  }
}
