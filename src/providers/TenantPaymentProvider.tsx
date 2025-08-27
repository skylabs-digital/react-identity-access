import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { BaseConnector } from '../connectors/base/BaseConnector';
import { TenantPaymentConfig, TenantCustomer, TenantPayment, PaymentGateway } from '../types';
import { useIdentityContext } from './IdentityProvider';
import { PaymentGatewayFactory } from '../gateways';

// State interface
interface TenantPaymentState {
  config: TenantPaymentConfig | null;
  customers: TenantCustomer[];
  payments: TenantPayment[];
  gateways: Record<string, PaymentGateway>;
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
}

// Context interface
interface TenantPaymentContextValue {
  state: TenantPaymentState;
  connector: BaseConnector;
  // Configuration
  updateGatewayConfig: (gateway: string, config: Record<string, any>) => Promise<void>;
  enableGateway: (gateway: string) => Promise<void>;
  disableGateway: (gateway: string) => Promise<void>;
  setDefaultGateway: (gateway: string) => Promise<void>;
  // Customer management
  createCustomer: (
    customerData: Omit<TenantCustomer, 'id' | 'tenantId' | 'createdAt'>
  ) => Promise<TenantCustomer>;
  updateCustomer: (customerId: string, customerData: Partial<TenantCustomer>) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  getCustomer: (customerId: string) => TenantCustomer | null;
  // Payment processing
  createPayment: (
    customerId: string,
    amount: number,
    currency: string,
    description: string,
    gateway?: string
  ) => Promise<TenantPayment>;
  refundPayment: (paymentId: string, amount?: number) => Promise<void>;
  getPaymentsByCustomer: (customerId: string) => TenantPayment[];
  // Helpers
  getAvailableGateways: () => string[];
  getGatewayConfig: (gateway: string) => Record<string, any> | null;
  isGatewayEnabled: (gateway: string) => boolean;
}

interface TenantPaymentProviderProps {
  initialState?: Partial<TenantPaymentState>;
  children: ReactNode;
}

// Create context
const TenantPaymentContext = createContext<TenantPaymentContextValue | null>(null);

// Initial state
const initialTenantPaymentState: TenantPaymentState = {
  config: null,
  customers: [],
  payments: [],
  gateways: {},
  isLoading: true,
  error: null,
  lastSync: null,
};

// Action types
type TenantPaymentAction =
  | { type: 'LOADING'; payload: boolean }
  | { type: 'ERROR'; payload: string }
  | { type: 'CONFIG_SET'; payload: TenantPaymentConfig }
  | { type: 'CUSTOMERS_SET'; payload: TenantCustomer[] }
  | { type: 'CUSTOMER_ADD'; payload: TenantCustomer }
  | { type: 'CUSTOMER_UPDATE'; payload: { id: string; data: Partial<TenantCustomer> } }
  | { type: 'CUSTOMER_REMOVE'; payload: string }
  | { type: 'PAYMENTS_SET'; payload: TenantPayment[] }
  | { type: 'PAYMENT_ADD'; payload: TenantPayment }
  | { type: 'PAYMENT_UPDATE'; payload: { id: string; data: Partial<TenantPayment> } }
  | { type: 'GATEWAY_SET'; payload: { name: string; gateway: PaymentGateway } }
  | { type: 'SYNC_COMPLETE' };

// Reducer
function tenantPaymentReducer(
  state: TenantPaymentState,
  action: TenantPaymentAction
): TenantPaymentState {
  switch (action.type) {
    case 'LOADING':
      return {
        ...state,
        isLoading: action.payload,
        error: action.payload ? null : state.error,
      };

    case 'ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };

    case 'CONFIG_SET':
      return {
        ...state,
        config: action.payload,
        isLoading: false,
        error: null,
      };

    case 'CUSTOMERS_SET':
      return {
        ...state,
        customers: action.payload,
      };

    case 'CUSTOMER_ADD':
      return {
        ...state,
        customers: [...state.customers, action.payload],
      };

    case 'CUSTOMER_UPDATE':
      return {
        ...state,
        customers: state.customers.map(customer =>
          customer.id === action.payload.id ? { ...customer, ...action.payload.data } : customer
        ),
      };

    case 'CUSTOMER_REMOVE':
      return {
        ...state,
        customers: state.customers.filter(customer => customer.id !== action.payload),
      };

    case 'PAYMENTS_SET':
      return {
        ...state,
        payments: action.payload,
      };

    case 'PAYMENT_ADD':
      return {
        ...state,
        payments: [...state.payments, action.payload],
      };

    case 'PAYMENT_UPDATE':
      return {
        ...state,
        payments: state.payments.map(payment =>
          payment.id === action.payload.id ? { ...payment, ...action.payload.data } : payment
        ),
      };

    case 'GATEWAY_SET':
      return {
        ...state,
        gateways: {
          ...state.gateways,
          [action.payload.name]: action.payload.gateway,
        },
      };

    case 'SYNC_COMPLETE':
      return {
        ...state,
        lastSync: new Date(),
      };

    default:
      return state;
  }
}

export function TenantPaymentProvider({
  initialState: ssrInitialState,
  children,
}: TenantPaymentProviderProps) {
  const { connector, tenant } = useIdentityContext();

  // Create initial state with SSR data if provided
  const createInitialState = (): TenantPaymentState => {
    const baseState = { ...initialTenantPaymentState };

    if (ssrInitialState) {
      return { ...baseState, ...ssrInitialState };
    }

    return baseState;
  };

  const [state, dispatch] = useReducer(tenantPaymentReducer, createInitialState());

  // Initialize tenant payment data
  useEffect(() => {
    if (tenant.currentTenant && !ssrInitialState) {
      initializeTenantPaymentData();
    }
  }, [tenant.currentTenant]);

  const initializeTenantPaymentData = async () => {
    if (!tenant.currentTenant) return;

    dispatch({ type: 'LOADING', payload: true });

    try {
      // Load tenant payment configuration and data using connector CRUD API
      const [configResponse, customersResponse, paymentsResponse] = await Promise.all([
        connector
          .get<TenantPaymentConfig>(`tenant-payment-config/${tenant.currentTenant.id}`)
          .catch(() => ({ success: false, data: null })),
        connector
          .list<TenantCustomer>(`tenant-customers/${tenant.currentTenant.id}`)
          .catch(() => ({ success: false, data: [] })),
        connector
          .list<TenantPayment>(`tenant-payments/${tenant.currentTenant.id}`)
          .catch(() => ({ success: false, data: [] })),
      ]);

      const config = configResponse.success ? configResponse.data : null;
      const customers = customersResponse.success ? customersResponse.data : [];
      const payments = paymentsResponse.success ? paymentsResponse.data : [];

      if (config) {
        dispatch({ type: 'CONFIG_SET', payload: config });

        // Initialize enabled gateways
        for (const gatewayName of config.enabledGateways) {
          try {
            const gateway = PaymentGatewayFactory.create(
              gatewayName,
              config.gatewayConfigs[gatewayName] || {}
            );
            await gateway.initialize(config.gatewayConfigs[gatewayName] || {});
            dispatch({ type: 'GATEWAY_SET', payload: { name: gatewayName, gateway } });
          } catch (error) {
            console.error(`Failed to initialize gateway ${gatewayName}:`, error);
          }
        }
      }

      dispatch({ type: 'CUSTOMERS_SET', payload: customers });
      dispatch({ type: 'PAYMENTS_SET', payload: payments });
      dispatch({ type: 'SYNC_COMPLETE' });
    } catch (error) {
      dispatch({
        type: 'ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load tenant payment data',
      });
    }
  };

  // Configuration methods
  const updateGatewayConfig = async (
    gateway: string,
    config: Record<string, any>
  ): Promise<void> => {
    if (!tenant.currentTenant || !state.config) throw new Error('No tenant payment config');

    try {
      const updatedConfig = {
        ...state.config,
        gatewayConfigs: {
          ...state.config.gatewayConfigs,
          [gateway]: config,
        },
      };

      const response = await connector.update<TenantPaymentConfig>(
        `tenant-payment-config/${tenant.currentTenant.id}`,
        tenant.currentTenant.id,
        updatedConfig
      );
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string' ? response.error : 'Failed to update config'
        );
      }
      dispatch({ type: 'CONFIG_SET', payload: updatedConfig });

      // Reinitialize gateway with new config
      if (state.config.enabledGateways.includes(gateway)) {
        const gatewayInstance = PaymentGatewayFactory.create(gateway, config);
        await gatewayInstance.initialize(config);
        dispatch({ type: 'GATEWAY_SET', payload: { name: gateway, gateway: gatewayInstance } });
      }
    } catch (error) {
      dispatch({
        type: 'ERROR',
        payload: error instanceof Error ? error.message : 'Failed to update gateway config',
      });
      throw error;
    }
  };

  const enableGateway = async (gateway: string): Promise<void> => {
    if (!tenant.currentTenant || !state.config) throw new Error('No tenant payment config');

    try {
      const updatedConfig = {
        ...state.config,
        enabledGateways: [...new Set([...state.config.enabledGateways, gateway])],
      };

      const response = await connector.update<TenantPaymentConfig>(
        `tenant-payment-config/${tenant.currentTenant.id}`,
        tenant.currentTenant.id,
        updatedConfig
      );
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string' ? response.error : 'Failed to update config'
        );
      }
      dispatch({ type: 'CONFIG_SET', payload: updatedConfig });

      // Initialize the gateway
      const gatewayInstance = PaymentGatewayFactory.create(
        gateway,
        state.config.gatewayConfigs[gateway] || {}
      );
      await gatewayInstance.initialize(state.config.gatewayConfigs[gateway] || {});
      dispatch({ type: 'GATEWAY_SET', payload: { name: gateway, gateway: gatewayInstance } });
    } catch (error) {
      dispatch({
        type: 'ERROR',
        payload: error instanceof Error ? error.message : 'Failed to enable gateway',
      });
      throw error;
    }
  };

  const disableGateway = async (gateway: string): Promise<void> => {
    if (!tenant.currentTenant || !state.config) throw new Error('No tenant payment config');

    try {
      const updatedConfig = {
        ...state.config,
        enabledGateways: state.config.enabledGateways.filter(g => g !== gateway),
        defaultGateway:
          state.config.defaultGateway === gateway
            ? state.config.enabledGateways.find(g => g !== gateway) || ''
            : state.config.defaultGateway,
      };

      const response = await connector.update<TenantPaymentConfig>(
        `tenant-payment-config/${tenant.currentTenant.id}`,
        tenant.currentTenant.id,
        updatedConfig
      );
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string' ? response.error : 'Failed to update config'
        );
      }
      dispatch({ type: 'CONFIG_SET', payload: updatedConfig });
    } catch (error) {
      dispatch({
        type: 'ERROR',
        payload: error instanceof Error ? error.message : 'Failed to disable gateway',
      });
      throw error;
    }
  };

  const setDefaultGateway = async (gateway: string): Promise<void> => {
    if (!tenant.currentTenant || !state.config) throw new Error('No tenant payment config');

    if (!state.config.enabledGateways.includes(gateway)) {
      throw new Error('Gateway must be enabled before setting as default');
    }

    try {
      const updatedConfig = {
        ...state.config,
        defaultGateway: gateway,
      };

      const response = await connector.update<TenantPaymentConfig>(
        `tenant-payment-config/${tenant.currentTenant.id}`,
        tenant.currentTenant.id,
        updatedConfig
      );
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string' ? response.error : 'Failed to update config'
        );
      }
      dispatch({ type: 'CONFIG_SET', payload: updatedConfig });
    } catch (error) {
      dispatch({
        type: 'ERROR',
        payload: error instanceof Error ? error.message : 'Failed to set default gateway',
      });
      throw error;
    }
  };

  // Customer management methods
  const createCustomer = async (
    customerData: Omit<TenantCustomer, 'id' | 'tenantId' | 'createdAt'>
  ): Promise<TenantCustomer> => {
    if (!tenant.currentTenant) throw new Error('No current tenant');

    try {
      const response = await connector.create<TenantCustomer>(
        `tenant-customers/${tenant.currentTenant.id}`,
        { ...customerData, tenantId: tenant.currentTenant.id }
      );
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string' ? response.error : 'Failed to create customer'
        );
      }
      const customer = response.data;
      dispatch({ type: 'CUSTOMER_ADD', payload: customer });
      return customer;
    } catch (error) {
      dispatch({
        type: 'ERROR',
        payload: error instanceof Error ? error.message : 'Failed to create customer',
      });
      throw error;
    }
  };

  const updateCustomer = async (
    customerId: string,
    customerData: Partial<TenantCustomer>
  ): Promise<void> => {
    try {
      const response = await connector.update<TenantCustomer>(
        `tenant-customers/${tenant.currentTenant?.id}`,
        customerId,
        customerData
      );
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string' ? response.error : 'Failed to update customer'
        );
      }
      dispatch({ type: 'CUSTOMER_UPDATE', payload: { id: customerId, data: customerData } });
    } catch (error) {
      dispatch({
        type: 'ERROR',
        payload: error instanceof Error ? error.message : 'Failed to update customer',
      });
      throw error;
    }
  };

  const deleteCustomer = async (customerId: string): Promise<void> => {
    try {
      const response = await connector.delete(
        `tenant-customers/${tenant.currentTenant?.id}`,
        customerId
      );
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string' ? response.error : 'Failed to delete customer'
        );
      }
      dispatch({ type: 'CUSTOMER_REMOVE', payload: customerId });
    } catch (error) {
      dispatch({
        type: 'ERROR',
        payload: error instanceof Error ? error.message : 'Failed to delete customer',
      });
      throw error;
    }
  };

  const getCustomer = (customerId: string): TenantCustomer | null => {
    return state.customers.find(customer => customer.id === customerId) || null;
  };

  // Payment processing methods
  const createPayment = async (
    customerId: string,
    amount: number,
    currency: string,
    description: string,
    gateway?: string
  ): Promise<TenantPayment> => {
    if (!tenant.currentTenant || !state.config) throw new Error('No tenant payment config');

    const gatewayToUse = gateway || state.config.defaultGateway;
    if (!gatewayToUse || !state.config.enabledGateways.includes(gatewayToUse)) {
      throw new Error('Invalid or disabled payment gateway');
    }

    try {
      const response = await connector.create<TenantPayment>(
        `tenant-payments/${tenant.currentTenant.id}`,
        {
          customerId,
          amount,
          currency,
          description,
          gateway: gatewayToUse,
          tenantId: tenant.currentTenant.id,
        }
      );
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string' ? response.error : 'Failed to create payment'
        );
      }
      const payment = response.data;

      dispatch({ type: 'PAYMENT_ADD', payload: payment });
      return payment;
    } catch (error) {
      dispatch({
        type: 'ERROR',
        payload: error instanceof Error ? error.message : 'Failed to create payment',
      });
      throw error;
    }
  };

  const refundPayment = async (paymentId: string, _amount?: number): Promise<void> => {
    try {
      const response = await connector.update<TenantPayment>(
        `tenant-payments/${tenant.currentTenant?.id}`,
        paymentId,
        { status: 'refunded' }
      );
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string' ? response.error : 'Failed to refund payment'
        );
      }

      // Update payment status
      dispatch({
        type: 'PAYMENT_UPDATE',
        payload: {
          id: paymentId,
          data: { status: 'refunded' },
        },
      });
    } catch (error) {
      dispatch({
        type: 'ERROR',
        payload: error instanceof Error ? error.message : 'Failed to refund payment',
      });
      throw error;
    }
  };

  const getPaymentsByCustomer = (customerId: string): TenantPayment[] => {
    return state.payments.filter(payment => payment.customerId === customerId);
  };

  // Helper methods
  const getAvailableGateways = (): string[] => {
    return PaymentGatewayFactory.getAvailableGateways();
  };

  const getGatewayConfig = (gateway: string): Record<string, any> | null => {
    return state.config?.gatewayConfigs[gateway] || null;
  };

  const isGatewayEnabled = (gateway: string): boolean => {
    return state.config?.enabledGateways.includes(gateway) || false;
  };

  const contextValue: TenantPaymentContextValue = {
    state,
    connector,
    updateGatewayConfig,
    enableGateway,
    disableGateway,
    setDefaultGateway,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomer,
    createPayment,
    refundPayment,
    getPaymentsByCustomer,
    getAvailableGateways,
    getGatewayConfig,
    isGatewayEnabled,
  };

  return (
    <TenantPaymentContext.Provider value={contextValue}>{children}</TenantPaymentContext.Provider>
  );
}

// Hook to use the tenant payment context
export function useTenantPayment(): TenantPaymentContextValue {
  const context = useContext(TenantPaymentContext);
  if (!context) {
    throw new Error('useTenantPayment must be used within TenantPaymentProvider');
  }
  return context;
}
