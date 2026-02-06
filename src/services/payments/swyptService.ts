import { Alert } from 'react-native';
import { lightAppColors } from '../../theme/colors';

// Swypt API Configuration
const SWYPT_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_SWYPT_API_KEY || '',
  merchantId: process.env.EXPO_PUBLIC_SWYPT_MERCHANT_ID || '',
  baseUrl: 'https://api.swypt.africa', // Use sandbox URL in development
  webhookUrl: `${process.env.EXPO_PUBLIC_CALLBACK_BASE_URL}/swypt/webhook`,
};

// Kenyan currency formatting (same as M-Pesa service)
export const formatKes = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Swypt API types
export interface SwyptPaymentRequest {
  amount: number;
  currency: 'KES';
  description: string;
  customerEmail?: string;
  customerPhone?: string;
  reference: string;
  callbackUrl?: string;
  paymentMethods?: ('card' | 'bank' | 'mobile')[];
  splitPayments?: SplitPayment[];
  recurring?: RecurringPayment;
}

export interface SplitPayment {
  amount: number;
  description: string;
  recipientEmail: string;
  recipientPhone?: string;
}

export interface RecurringPayment {
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  maxPayments?: number;
}

export interface SwyptPaymentResponse {
  paymentId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentUrl?: string;
  reference: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface SwyptWebhookPayload {
  event: 'payment.completed' | 'payment.failed' | 'recurring.payment' | 'split.payment.completed';
  paymentId: string;
  reference: string;
  amount: number;
  status: string;
  metadata?: Record<string, any>;
}

// Authentication
export const getSwyptAuthHeaders = () => {
  return {
    'Authorization': `Bearer ${SWYPT_CONFIG.apiKey}`,
    'X-Merchant-ID': SWYPT_CONFIG.merchantId,
    'Content-Type': 'application/json',
  };
};

// Create payment
export const createSwyptPayment = async (request: SwyptPaymentRequest): Promise<SwyptPaymentResponse> => {
  try {
    const response = await fetch(`${SWYPT_CONFIG.baseUrl}/payments`, {
      method: 'POST',
      headers: getSwyptAuthHeaders(),
      body: JSON.stringify({
        ...request,
        callbackUrl: request.callbackUrl || SWYPT_CONFIG.webhookUrl,
        metadata: {
          source: 'househunter',
          type: 'rent_payment',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create Swypt payment');
    }

    return data;
  } catch (error) {
    console.error('Swypt Payment Creation Error:', error);
    throw error;
  }
};

// Get payment status
export const getSwyptPaymentStatus = async (paymentId: string): Promise<SwyptPaymentResponse> => {
  try {
    const response = await fetch(`${SWYPT_CONFIG.baseUrl}/payments/${paymentId}`, {
      method: 'GET',
      headers: getSwyptAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get payment status');
    }

    return data;
  } catch (error) {
    console.error('Swypt Payment Status Error:', error);
    throw error;
  }
};

// Create split payment for multiple tenants
export const createSplitRentPayment = async (
  totalAmount: number,
  tenantPayments: SplitPayment[],
  propertyTitle: string,
  landlordEmail: string
): Promise<SwyptPaymentResponse> => {
  const request: SwyptPaymentRequest = {
    amount: totalAmount,
    currency: 'KES',
    description: `Split rent payment for ${propertyTitle}`,
    reference: `split-rent-${Date.now()}`,
    splitPayments: tenantPayments,
    paymentMethods: ['card', 'bank', 'mobile'],
  };

  return createSwyptPayment(request);
};

// Create escrow for security deposit
export const createSecurityDepositEscrow = async (
  amount: number,
  tenantEmail: string,
  landlordEmail: string,
  propertyTitle: string
): Promise<SwyptPaymentResponse> => {
  const request: SwyptPaymentRequest = {
    amount,
    currency: 'KES',
    description: `Security deposit escrow for ${propertyTitle}`,
    customerEmail: tenantEmail,
    reference: `escrow-deposit-${Date.now()}`,
    paymentMethods: ['card', 'bank'],
  };

  return createSwyptPayment(request);
};

// Setup recurring rent payments
export const setupRecurringRentPayment = async (
  amount: number,
  tenantEmail: string,
  propertyTitle: string,
  startDate: Date,
  endDate?: Date
): Promise<SwyptPaymentResponse> => {
  const request: SwyptPaymentRequest = {
    amount,
    currency: 'KES',
    description: `Monthly rent for ${propertyTitle}`,
    customerEmail: tenantEmail,
    reference: `recurring-rent-${Date.now()}`,
    recurring: {
      interval: 'monthly',
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate?.toISOString().split('T')[0],
    },
    paymentMethods: ['card', 'bank'],
  };

  return createSwyptPayment(request);
};

// Get payment methods comparison
export const getPaymentMethodsComparison = () => {
  return {
    mpesa: {
      name: 'M-Pesa',
      fees: 'Free for amounts under KSh 100,000',
      processingTime: 'Instant',
      methods: ['Mobile Money'],
      limits: 'Up to KSh 150,000 per transaction',
    },
    swyptCard: {
      name: 'Swypt Card',
      fees: '2.5% + KSh 10 per transaction',
      processingTime: '1-2 business days',
      methods: ['Visa', 'Mastercard', 'American Express'],
      limits: 'No transaction limit',
    },
    swyptBank: {
      name: 'Swypt Bank Transfer',
      fees: 'KSh 25 per transaction',
      processingTime: '1-3 business days',
      methods: ['All Kenyan banks'],
      limits: 'No transaction limit',
    },
  };
};

// Generate invoice
export const generateInvoice = async (
  amount: number,
  description: string,
  customerEmail: string,
  propertyTitle: string
): Promise<string> => {
  try {
    const response = await fetch(`${SWYPT_CONFIG.baseUrl}/invoices`, {
      method: 'POST',
      headers: getSwyptAuthHeaders(),
      body: JSON.stringify({
        amount,
        currency: 'KES',
        description,
        customerEmail,
        reference: `invoice-${Date.now()}`,
        items: [{
          name: propertyTitle,
          description,
          amount,
          quantity: 1,
        }],
        branding: {
          logo: 'https://househunter.com/logo.png',
          primaryColor: lightAppColors.chatBubbleSent,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to generate invoice');
    }

    return data.invoiceUrl;
  } catch (error) {
    console.error('Invoice Generation Error:', error);
    throw error;
  }
};

// Process webhook
export const processSwyptWebhook = async (payload: SwyptWebhookPayload) => {
  try {
    // Verify webhook signature (implement in production)
    // const isValid = verifyWebhookSignature(payload);

    switch (payload.event) {
      case 'payment.completed':
        // Update payment status in database
        await updatePaymentStatus(payload.paymentId, 'completed', payload);
        break;

      case 'payment.failed':
        // Handle failed payment
        await updatePaymentStatus(payload.paymentId, 'failed', payload);
        break;

      case 'recurring.payment':
        // Process recurring payment
        await processRecurringPayment(payload);
        break;

      case 'split.payment.completed':
        // Handle split payment completion
        await processSplitPayment(payload);
        break;

      default:
        console.log('Unknown webhook event:', payload.event);
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    throw error;
  }
};

// Helper functions (implement based on your database)
const updatePaymentStatus = async (paymentId: string, status: string, payload: SwyptWebhookPayload) => {
  // Implement database update logic
  console.log(`Payment ${paymentId} status updated to ${status}`, payload);
};

const processRecurringPayment = async (payload: SwyptWebhookPayload) => {
  // Implement recurring payment processing
  console.log('Processing recurring payment:', payload);
};

const processSplitPayment = async (payload: SwyptWebhookPayload) => {
  // Implement split payment processing
  console.log('Processing split payment:', payload);
};

// Utility functions
export const isValidSwyptAmount = (amount: number): boolean => {
  return amount >= 1 && amount <= 10000000; // 1 KES to 10M KES
};

export const formatSwyptReference = (type: string, id: string): string => {
  return `${type}-${Date.now()}-${id.slice(0, 8)}`;
};
