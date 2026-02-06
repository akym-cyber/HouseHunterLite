import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  HelperText,
} from 'react-native-paper';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/theme/useTheme';
import { VALIDATION_RULES, ERROR_MESSAGES } from '../../src/utils/constants';

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const validateEmail = (email: string) => {
    if (!email) {
      return 'Email is required';
    }
    if (!VALIDATION_RULES.EMAIL.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError('');
  };

  const handleResetPassword = async () => {
    const emailValidation = validateEmail(email);
    if (emailValidation) {
      setEmailError(emailValidation);
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(email);

      if (result.success) {
        setSent(true);
        Alert.alert(
          'Reset Email Sent',
          'Please check your email for password reset instructions.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', result.error || ERROR_MESSAGES.UNKNOWN_ERROR);
      }
    } catch (error) {
      Alert.alert('Error', ERROR_MESSAGES.UNKNOWN_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Title style={styles.title}>Reset Password</Title>
              <Paragraph style={styles.subtitle}>
                Enter your email address and we'll send you a link to reset your password
              </Paragraph>

              <TextInput
                label="Email"
                value={email}
                onChangeText={handleEmailChange}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                error={!!emailError}
                disabled={loading || sent}
              />
              <HelperText type="error" visible={!!emailError}>
                {emailError}
              </HelperText>

              <Button
                mode="contained"
                onPress={handleResetPassword}
                style={styles.button}
                loading={loading}
                disabled={loading || sent}
              >
                Send Reset Email
              </Button>

              <Button
                mode="text"
                onPress={handleBackToLogin}
                style={styles.textButton}
                disabled={loading}
              >
                Back to Sign In
              </Button>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.app.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    elevation: 4,
    borderRadius: 12,
  },
  cardContent: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: theme.colors.primary,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: theme.colors.onSurfaceVariant,
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
    marginBottom: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  textButton: {
    marginBottom: 16,
  },
}); 
