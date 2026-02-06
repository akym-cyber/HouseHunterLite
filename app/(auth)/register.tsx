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
  SegmentedButtons,
} from 'react-native-paper';
import { Link, router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/theme/useTheme';
import { VALIDATION_RULES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../src/utils/constants';
import { UserRole } from '../../src/types/database';

export default function RegisterScreen() {
  const { theme } = useTheme();
  const { signUp, loading } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'tenant' as UserRole,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'firstName':
        return !value ? 'First name is required' : '';
      case 'lastName':
        return !value ? 'Last name is required' : '';
      case 'email':
        if (!value) return 'Email is required';
        if (!VALIDATION_RULES.EMAIL.test(value)) {
          return 'Please enter a valid email address';
        }
        return '';
      case 'phone':
        if (value && !VALIDATION_RULES.PHONE.test(value)) {
          return 'Please enter a valid phone number';
        }
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
          return `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`;
        }
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) {
          return 'Passwords do not match';
        }
        return '';
      default:
        return '';
    }
  };

  const handleFieldChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) {
        newErrors[key] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    const userData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone || undefined,
      role: formData.role,
    };

    const result = await signUp(formData.email, formData.password, userData);
    
    if (result.success) {
      Alert.alert('Success', SUCCESS_MESSAGES.REGISTER_SUCCESS);
      router.replace('/(tabs)');
    } else {
      Alert.alert('Error', result.error || ERROR_MESSAGES.UNKNOWN_ERROR);
    }
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
              <Title style={styles.title}>Create Account</Title>
              <Paragraph style={styles.subtitle}>
                Join HouseHunter to find or list properties
              </Paragraph>

              <View style={styles.nameRow}>
                <TextInput
                  label="First Name"
                  value={formData.firstName}
                  onChangeText={(text) => handleFieldChange('firstName', text)}
                  mode="outlined"
                  style={[styles.input, styles.halfInput]}
                  error={!!errors.firstName}
                  disabled={loading}
                />
                <TextInput
                  label="Last Name"
                  value={formData.lastName}
                  onChangeText={(text) => handleFieldChange('lastName', text)}
                  mode="outlined"
                  style={[styles.input, styles.halfInput]}
                  error={!!errors.lastName}
                  disabled={loading}
                />
              </View>

              <TextInput
                label="Email"
                value={formData.email}
                onChangeText={(text) => handleFieldChange('email', text)}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                error={!!errors.email}
                disabled={loading}
              />
              <HelperText type="error" visible={!!errors.email}>
                {errors.email}
              </HelperText>

              <TextInput
                label="Phone (Optional)"
                value={formData.phone}
                onChangeText={(text) => handleFieldChange('phone', text)}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.input}
                error={!!errors.phone}
                disabled={loading}
              />
              <HelperText type="error" visible={!!errors.phone}>
                {errors.phone}
              </HelperText>

              <Text style={styles.roleLabel}>I am a:</Text>
              <SegmentedButtons
                value={formData.role}
                onValueChange={(value) => handleFieldChange('role', value)}
                buttons={[
                  { value: 'tenant', label: 'Tenant' },
                  { value: 'owner', label: 'Owner' },
                ]}
                style={styles.roleButtons}
              />

              <TextInput
                label="Password"
                value={formData.password}
                onChangeText={(text) => handleFieldChange('password', text)}
                mode="outlined"
                secureTextEntry={!showPassword}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={styles.input}
                error={!!errors.password}
                disabled={loading}
              />
              <HelperText type="error" visible={!!errors.password}>
                {errors.password}
              </HelperText>

              <TextInput
                label="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(text) => handleFieldChange('confirmPassword', text)}
                mode="outlined"
                secureTextEntry={!showConfirmPassword}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
                style={styles.input}
                error={!!errors.confirmPassword}
                disabled={loading}
              />
              <HelperText type="error" visible={!!errors.confirmPassword}>
                {errors.confirmPassword}
              </HelperText>

              <Button
                mode="contained"
                onPress={handleRegister}
                style={styles.button}
                loading={loading}
                disabled={loading}
              >
                Create Account
              </Button>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                  <Text style={styles.loginLink}>Sign In</Text>
                </Link>
              </View>
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
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  input: {
    marginBottom: 8,
  },
  halfInput: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.onSurface,
  },
  roleButtons: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
    marginBottom: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: theme.colors.onSurfaceVariant,
  },
  loginLink: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
}); 
