import React, { useState } from 'react';
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
import { Link, router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { defaultTheme } from '../../src/styles/theme';
import { VALIDATION_RULES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../src/utils/constants';

export default function LoginScreen() {
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (email: string) => {
    if (!email) {
      return 'Email is required';
    }
    if (!VALIDATION_RULES.EMAIL.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
      return `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`;
    }
    return '';
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError('');
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordError('');
  };

  const validateForm = () => {
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    setEmailError(emailValidation);
    setPasswordError(passwordValidation);

    return !emailValidation && !passwordValidation;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    const result = await signIn(email, password);
    
    if (result.success) {
      Alert.alert('Success', SUCCESS_MESSAGES.LOGIN_SUCCESS);
      router.replace('/(tabs)');
    } else {
      Alert.alert('Error', result.error || ERROR_MESSAGES.UNKNOWN_ERROR);
    }
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

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
              <Title style={styles.title}>Welcome Back</Title>
              <Paragraph style={styles.subtitle}>
                Sign in to your HouseHunter account
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
                disabled={loading}
              />
              <HelperText type="error" visible={!!emailError}>
                {emailError}
              </HelperText>

              <TextInput
                label="Password"
                value={password}
                onChangeText={handlePasswordChange}
                mode="outlined"
                secureTextEntry={!showPassword}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={styles.input}
                error={!!passwordError}
                disabled={loading}
              />
              <HelperText type="error" visible={!!passwordError}>
                {passwordError}
              </HelperText>

              <Button
                mode="contained"
                onPress={handleLogin}
                style={styles.button}
                loading={loading}
                disabled={loading}
              >
                Sign In
              </Button>

              <Button
                mode="text"
                onPress={handleForgotPassword}
                style={styles.textButton}
                disabled={loading}
              >
                Forgot Password?
              </Button>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Don't have an account? </Text>
                <Link href="/(auth)/register" asChild>
                  <Text style={styles.registerLink}>Sign Up</Text>
                </Link>
              </View>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultTheme.colors.background,
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
    color: defaultTheme.colors.primary,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: defaultTheme.colors.onSurfaceVariant,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: defaultTheme.colors.outline,
  },
  dividerText: {
    marginHorizontal: 16,
    color: defaultTheme.colors.onSurfaceVariant,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: defaultTheme.colors.onSurfaceVariant,
  },
  registerLink: {
    color: defaultTheme.colors.primary,
    fontWeight: 'bold',
  },
}); 