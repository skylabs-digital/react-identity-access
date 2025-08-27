export { BasePaymentGateway } from './base/PaymentGateway';
export { StripeGateway } from './stripe/StripeGateway';
export { MercadoPagoGateway } from './mercadopago/MercadoPagoGateway';

// Gateway factory
export class PaymentGatewayFactory {
  private static gateways = new Map<string, any>();

  static register(name: string, gatewayClass: any): void {
    this.gateways.set(name, gatewayClass);
  }

  static create(name: string, _config: Record<string, any>): any {
    const GatewayClass = this.gateways.get(name);
    if (!GatewayClass) {
      throw new Error(`Payment gateway '${name}' not found`);
    }

    const gateway = new GatewayClass();
    return gateway;
  }

  static getAvailableGateways(): string[] {
    return Array.from(this.gateways.keys());
  }
}

// Register default gateways
import { StripeGateway } from './stripe/StripeGateway';
import { MercadoPagoGateway } from './mercadopago/MercadoPagoGateway';

PaymentGatewayFactory.register('stripe', StripeGateway);
PaymentGatewayFactory.register('mercadopago', MercadoPagoGateway);
