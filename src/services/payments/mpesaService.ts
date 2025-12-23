import { Alert } from 'react-native';

// M-Pesa API Configuration
const MPESA_CONFIG = {
  consumerKey: process.env.EXPO_PUBLIC_MPESA_CONSUMER_KEY || '',
  consumerSecret: process.env.EXPO_PUBLIC_MPESA_CONSUMER_SECRET || '',
  passkey: process.env.EXPO_PUBLIC_MPESA_PASSKEY || '',
  shortcode: process.env.EXPO_PUBLIC_MPESA_SHORTCODE || '',
  baseUrl: 'https://sandbox.safaricom.co.ke', // Use production URL in production
};

// Kenyan currency formatting
export const formatKes = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

// M-Pesa STK Push types
export interface StkPushRequest {
  phoneNumber: string; // Format: 254XXXXXXXXX
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

export interface StkPushResponse {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

export interface StkPushQueryResponse {
  responseCode: string;
  responseDescription: string;
  merchantRequestId: string;
  checkoutRequestId: string;
  resultCode: string;
  resultDesc: string;
}

// Authentication
export const getMpesaAccessToken = async (): Promise<string> => {
  try {
    const auth = btoa(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`);

    const response = await fetch(`${MPESA_CONFIG.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('M-Pesa Auth Error:', error);
    throw new Error('Failed to authenticate with M-Pesa');
  }
};

// STK Push (Lipa na M-Pesa Online)
export const initiateStkPush = async (request: StkPushRequest): Promise<StkPushResponse> => {
  try {
    const accessToken = await getMpesaAccessToken();

    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);

    // Generate password
    const password = btoa(`${MPESA_CONFIG.shortcode}${MPESA_CONFIG.passkey}${timestamp}`);

    const payload = {
      BusinessShortCode: MPESA_CONFIG.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: request.amount,
      PartyA: request.phoneNumber,
      PartyB: MPESA_CONFIG.shortcode,
      PhoneNumber: request.phoneNumber,
      CallBackURL: `${process.env.EXPO_PUBLIC_CALLBACK_BASE_URL}/mpesa/callback`,
      AccountReference: request.accountReference,
      TransactionDesc: request.transactionDesc,
    };

    const response = await fetch(`${MPESA_CONFIG.baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.ResponseCode !== '0') {
      throw new Error(data.CustomerMessage || 'STK Push failed');
    }

    return data;
  } catch (error) {
    console.error('STK Push Error:', error);
    throw error;
  }
};

// Query STK Push status
export const queryStkPushStatus = async (checkoutRequestId: string): Promise<StkPushQueryResponse> => {
  try {
    const accessToken = await getMpesaAccessToken();

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = btoa(`${MPESA_CONFIG.shortcode}${MPESA_CONFIG.passkey}${timestamp}`);

    const payload = {
      BusinessShortCode: MPESA_CONFIG.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    const response = await fetch(`${MPESA_CONFIG.baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('STK Query Error:', error);
    throw error;
  }
};

// Register C2B URLs (for receiving payments)
export const registerC2bUrls = async (): Promise<any> => {
  try {
    const accessToken = await getMpesaAccessToken();

    const payload = {
      ShortCode: MPESA_CONFIG.shortcode,
      ResponseType: 'Completed',
      ConfirmationURL: `${process.env.EXPO_PUBLIC_CALLBACK_BASE_URL}/mpesa/confirmation`,
      ValidationURL: `${process.env.EXPO_PUBLIC_CALLBACK_BASE_URL}/mpesa/validation`,
    };

    const response = await fetch(`${MPESA_CONFIG.baseUrl}/mpesa/c2b/v1/registerurl`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('C2B Registration Error:', error);
    throw error;
  }
};

// Format phone number to Kenyan format
export const formatKenyanPhone = (phone: string): string => {
  // Remove any non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Handle different formats
  if (cleaned.startsWith('254')) {
    return cleaned;
  } else if (cleaned.startsWith('0')) {
    return `254${cleaned.slice(1)}`;
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    return `254${cleaned}`;
  }

  // Assume it's already in correct format
  return cleaned;
};

// Validate phone number
export const isValidKenyanPhone = (phone: string): boolean => {
  const formatted = formatKenyanPhone(phone);
  return /^254[17]\d{8}$/.test(formatted);
};

// Payment status checker
export const checkPaymentStatus = async (checkoutRequestId: string): Promise<'pending' | 'completed' | 'failed' | 'cancelled'> => {
  try {
    const response = await queryStkPushStatus(checkoutRequestId);

    switch (response.resultCode) {
      case '0':
        return 'completed';
      case '1':
        return 'failed';
      case '1032':
        return 'cancelled';
      default:
        return 'pending';
    }
  } catch (error) {
    console.error('Payment status check error:', error);
    return 'pending';
  }
};

// Utility function to create rent payment request
export const createRentPaymentRequest = (
  phoneNumber: string,
  amount: number,
  propertyTitle: string,
  tenantName: string
): StkPushRequest => {
  return {
    phoneNumber: formatKenyanPhone(phoneNumber),
    amount,
    accountReference: `Rent-${propertyTitle}-${tenantName}`,
    transactionDesc: `Rent payment for ${propertyTitle}`,
  };
};

// Utility function to create deposit payment request
export const createDepositPaymentRequest = (
  phoneNumber: string,
  amount: number,
  propertyTitle: string,
  tenantName: string
): StkPushRequest => {
  return {
    phoneNumber: formatKenyanPhone(phoneNumber),
    amount,
    accountReference: `Deposit-${propertyTitle}-${tenantName}`,
    transactionDesc: `Security deposit for ${propertyTitle}`,
  };
};
