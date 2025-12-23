import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  TextInput,
  Chip,
  Divider,
  IconButton,
  Modal,
  Portal,
} from 'react-native-paper';
import { Property, Message } from '../../types/database';
import { useAuth } from '../../hooks/useAuth';
import { defaultTheme } from '../../styles/theme';
import {
  initiateStkPush,
  formatKes,
  formatKenyanPhone,
  isValidKenyanPhone,
  createRentPaymentRequest,
  createDepositPaymentRequest,
  StkPushResponse,
} from '../../services/payments/mpesaService';
import {
  createSwyptPayment,
  getPaymentMethodsComparison,
  createSplitRentPayment,
  createSecurityDepositEscrow,
  setupRecurringRentPayment,
  SwyptPaymentRequest,
  SwyptPaymentResponse,
  SplitPayment,
} from '../../services/payments/swyptService';

interface PaymentIntegrationProps {
  property?: Property;
  conversationId: string;
  onSendMessage: (content: string) => Promise<void>;
  visible: boolean;
  onDismiss: () => void;
}

export default function PaymentIntegration({
  property,
  conversationId,
  onSendMessage,
  visible,
  onDismiss,
}: PaymentIntegrationProps) {
  const { user } = useAuth();
  const [paymentType, setPaymentType] = useState<'rent' | 'deposit' | 'custom'>('rent');
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'swypt'>('mpesa');
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [recurringPayment, setRecurringPayment] = useState(false);

  // Pre-fill phone number from user profile
  useEffect(() => {
    if (user?.phone) {
      setPhoneNumber(formatKenyanPhone(user.phone));
    }
  }, [user]);

  // Set default amount based on property and payment type
  useEffect(() => {
    if (property && paymentType === 'rent') {
      setAmount(property.price.toString());
    } else if (property && paymentType === 'deposit') {
      setAmount((property.deposit || property.price * 2).toString());
    }
  }, [property, paymentType]);

  const handlePayment = async () => {
    if (!property || !amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Validate contact info based on payment method
    if (paymentMethod === 'mpesa') {
      if (!phoneNumber || !isValidKenyanPhone(phoneNumber)) {
        Alert.alert('Error', 'Please enter a valid Kenyan phone number for M-Pesa');
        return;
      }
    } else if (paymentMethod === 'swypt') {
      if (!email) {
        Alert.alert('Error', 'Please enter your email for Swypt payment');
        return;
      }
    }

    setProcessing(true);

    try {
      if (paymentMethod === 'mpesa') {
        // Handle M-Pesa payment
        let request;
        if (paymentType === 'rent') {
          request = createRentPaymentRequest(
            phoneNumber,
            paymentAmount,
            property.title,
            user?.firstName || 'Tenant'
          );
        } else if (paymentType === 'deposit') {
          request = createDepositPaymentRequest(
            phoneNumber,
            paymentAmount,
            property.title,
            user?.firstName || 'Tenant'
          );
        } else {
          request = {
            phoneNumber: formatKenyanPhone(phoneNumber),
            amount: paymentAmount,
            accountReference: `Payment-${property.title}-${user?.firstName || 'Tenant'}`,
            transactionDesc: `Payment for ${property.title}`,
          };
        }

        const response: StkPushResponse = await initiateStkPush(request);

        // Send confirmation message
        const message = `💰 M-Pesa Payment initiated!\n\nAmount: ${formatKes(paymentAmount)}\nType: ${paymentType.charAt(0).toUpperCase() + paymentType.slice(1)}\nPhone: ${phoneNumber}\n\nPlease check your phone and enter your M-Pesa PIN to complete the payment.`;

        await onSendMessage(message);

        Alert.alert(
          'M-Pesa Payment Initiated',
          'Please check your phone and enter your M-Pesa PIN to complete the payment.',
          [{ text: 'OK', onPress: onDismiss }]
        );

      } else if (paymentMethod === 'swypt') {
        // Handle Swypt payment
        const request: SwyptPaymentRequest = {
          amount: paymentAmount,
          currency: 'KES',
          description: `${paymentType.charAt(0).toUpperCase() + paymentType.slice(1)} for ${property.title}`,
          customerEmail: email,
          customerPhone: phoneNumber,
          reference: `swypt-${Date.now()}`,
          paymentMethods: ['card', 'bank', 'mobile'],
        };

        const response: SwyptPaymentResponse = await createSwyptPayment(request);

        // Send confirmation message
        const message = `💳 Swypt Payment initiated!\n\nAmount: ${formatKes(paymentAmount)}\nType: ${paymentType.charAt(0).toUpperCase() + paymentType.slice(1)}\nEmail: ${email}\n\n${response.paymentUrl ? `Payment Link: ${response.paymentUrl}` : 'Check your email for payment instructions.'}`;

        await onSendMessage(message);

        Alert.alert(
          'Swypt Payment Initiated',
          response.paymentUrl
            ? 'Click the payment link to complete your transaction.'
            : 'Check your email for payment instructions.',
          [{ text: 'OK', onPress: onDismiss }]
        );
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', error.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const generateRentQuote = () => {
    if (!property) return;

    const quote = `🏠 Rent Quote for ${property.title}

📍 Location: ${property.addressLine1}, ${property.city}
💰 Monthly Rent: ${formatKes(property.price)}
🔒 Security Deposit: ${formatKes(property.deposit || property.price * 2)}

🛠️ Utilities: ${property.utilitiesIncluded ? 'Included' : 'Not included'}
🐕 Pet Policy: ${property.petFriendly ? 'Pet friendly' : 'No pets allowed'}
🅿️ Parking: ${property.parkingAvailable ? 'Available' : 'Not available'}

Move-in Date: ${property.availableDate || 'Available now'}`;

    onSendMessage(quote);
    onDismiss();
  };

  if (!property) {
    return null;
  }

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <Card style={styles.card}>
          <Card.Title
            title="Payment & Quotes"
            subtitle={property.title}
            right={(props) => (
              <IconButton {...props} icon="close" onPress={onDismiss} />
            )}
          />
          <Card.Content>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <Chip
                  icon="cash"
                  onPress={generateRentQuote}
                  style={styles.quickActionChip}
                >
                  Generate Rent Quote
                </Chip>
              </View>

              <Divider style={styles.divider} />

              {/* Payment Method Selection */}
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.paymentMethodContainer}>
                {[
                  { key: 'mpesa', label: 'M-Pesa', icon: 'cellphone', fees: 'Free < 100K', time: 'Instant' },
                  { key: 'swypt', label: 'Swypt', icon: 'credit-card', fees: '2.5% + 10KSh', time: '1-3 days' },
                ].map((method) => (
                  <TouchableOpacity
                    key={method.key}
                    style={[
                      styles.paymentMethodButton,
                      paymentMethod === method.key && styles.paymentMethodButtonActive,
                    ]}
                    onPress={() => setPaymentMethod(method.key as any)}
                  >
                    <IconButton icon={method.icon} size={20} />
                    <View style={styles.methodDetails}>
                      <Text style={[
                        styles.paymentMethodText,
                        paymentMethod === method.key && styles.paymentMethodTextActive,
                      ]}>
                        {method.label}
                      </Text>
                      <Text style={styles.methodFees}>{method.fees}</Text>
                      <Text style={styles.methodTime}>{method.time}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <Divider style={styles.divider} />

              {/* Payment Type Selection */}
              <Text style={styles.sectionTitle}>Payment Type</Text>
              <View style={styles.paymentTypeContainer}>
                {[
                  { key: 'rent', label: 'Monthly Rent', icon: 'home' },
                  { key: 'deposit', label: 'Security Deposit', icon: 'shield' },
                  { key: 'custom', label: 'Custom Payment', icon: 'cash' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.paymentTypeButton,
                      paymentType === type.key && styles.paymentTypeButtonActive,
                    ]}
                    onPress={() => setPaymentType(type.key as any)}
                  >
                    <IconButton icon={type.icon} size={20} />
                    <Text style={[
                      styles.paymentTypeText,
                      paymentType === type.key && styles.paymentTypeTextActive,
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount Input */}
              <TextInput
                label="Amount (KES)"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                left={<TextInput.Affix text="KSh" />}
              />

              {/* Phone Number Input */}
              <TextInput
                label="M-Pesa Phone Number"
                value={phoneNumber}
                onChangeText={(text) => setPhoneNumber(formatKenyanPhone(text))}
                keyboardType="phone-pad"
                mode="outlined"
                style={styles.input}
                placeholder="0712345678 or 254712345678"
                left={<TextInput.Affix text="+254" />}
              />

              {/* Payment Button */}
              <Button
                mode="contained"
                onPress={handlePayment}
                loading={processing}
                disabled={processing || !amount || !phoneNumber}
                style={styles.paymentButton}
                icon="cash"
              >
                {processing ? 'Processing...' : `Pay ${formatKes(parseFloat(amount) || 0)}`}
              </Button>

              {/* Payment Info */}
              <View style={styles.infoContainer}>
                <Text style={styles.infoTitle}>💡 How it works:</Text>
                <Text style={styles.infoText}>
                  1. Click "Pay" to initiate M-Pesa payment
                </Text>
                <Text style={styles.infoText}>
                  2. Check your phone for the STK push notification
                </Text>
                <Text style={styles.infoText}>
                  3. Enter your M-Pesa PIN to complete payment
                </Text>
                <Text style={styles.infoText}>
                  4. You'll receive a confirmation message
                </Text>
              </View>
            </ScrollView>
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    maxHeight: '80%',
  },
  card: {
    elevation: 8,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  quickActionChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: defaultTheme.colors.onSurface,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paymentMethodButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: defaultTheme.colors.outline,
    marginHorizontal: 4,
  },
  paymentMethodButtonActive: {
    backgroundColor: defaultTheme.colors.primaryContainer,
    borderColor: defaultTheme.colors.primary,
  },
  methodDetails: {
    alignItems: 'center',
    marginTop: 4,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: defaultTheme.colors.onSurfaceVariant,
  },
  paymentMethodTextActive: {
    color: defaultTheme.colors.primary,
  },
  methodFees: {
    fontSize: 10,
    color: defaultTheme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  methodTime: {
    fontSize: 10,
    color: defaultTheme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  paymentTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paymentTypeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: defaultTheme.colors.outline,
    marginHorizontal: 4,
  },
  paymentTypeButtonActive: {
    backgroundColor: defaultTheme.colors.primaryContainer,
    borderColor: defaultTheme.colors.primary,
  },
  paymentTypeText: {
    fontSize: 12,
    textAlign: 'center',
    color: defaultTheme.colors.onSurfaceVariant,
  },
  paymentTypeTextActive: {
    color: defaultTheme.colors.primary,
    fontWeight: '600',
  },
  input: {
    marginBottom: 16,
  },
  paymentButton: {
    marginVertical: 16,
  },
  infoContainer: {
    backgroundColor: defaultTheme.colors.surfaceVariant,
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: defaultTheme.colors.onSurfaceVariant,
  },
  infoText: {
    fontSize: 12,
    color: defaultTheme.colors.onSurfaceVariant,
    marginBottom: 4,
    lineHeight: 18,
  },
});
