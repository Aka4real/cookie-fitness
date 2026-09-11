import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'error' | 'success', text: string }

  async function signUpWithEmail() {
    setStatusMessage(null);
    if (!email.trim() || !password) {
      setStatusMessage({ type: 'error', text: 'Please enter both an email and a password.' });
      return;
    }
    if (password.length < 6) {
      setStatusMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }
    if (password !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    
    setLoading(true);
    
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your_supabase')) {
      setStatusMessage({ type: 'error', text: 'Supabase URL is missing in configuration.' });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setStatusMessage({ type: 'error', text: error.message });
        setLoading(false);
        return;
      }

      if (data?.session) {
        navigation.replace('Onboarding');
        return;
      }

      // If email confirmation is required, call our backend auto-confirm helper
      try {
        await fetch(`${API_URL}/api/auth/auto-confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() })
        });
      } catch (autoErr) {
        console.warn('Auto-confirm attempt error:', autoErr);
      }

      // Attempt automatic sign-in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (!signInError && signInData?.session) {
        navigation.replace('Onboarding');
      } else {
        setStatusMessage({
          type: 'success',
          text: 'Account created successfully! Please sign in with your password below.'
        });
        setIsSignUp(false);
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'An error occurred during account creation.' });
    } finally {
      setLoading(false);
    }
  }

  async function signInWithEmail() {
    setStatusMessage(null);
    if (!email.trim() || !password) {
      setStatusMessage({ type: 'error', text: 'Please enter both email and password.' });
      return;
    }

    setLoading(true);
    
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your_supabase')) {
      setStatusMessage({ type: 'error', text: 'Supabase URL is missing in configuration.' });
      setLoading(false);
      return;
    }

    try {
      let { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      // If unconfirmed, attempt auto-confirm and retry
      if (error && error.message?.toLowerCase().includes('email not confirmed')) {
        try {
          await fetch(`${API_URL}/api/auth/auto-confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim() })
          });

          const retry = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          data = retry.data;
          error = retry.error;
        } catch (_) {}
      }

      if (error) {
        setStatusMessage({ type: 'error', text: error.message });
      } else if (data?.session) {
        navigation.replace('Main');
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to sign in.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cookie Fit</Text>
      <Text style={styles.subtitle}>Your AI health coach</Text>

      {statusMessage && (
        <View style={[
          styles.statusCard, 
          statusMessage.type === 'error' ? styles.statusCardError : styles.statusCardSuccess
        ]}>
          <Text style={[
            styles.statusCardText, 
            statusMessage.type === 'error' ? styles.statusCardTextError : styles.statusCardTextSuccess
          ]}>
            {statusMessage.text}
          </Text>
        </View>
      )}

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          onChangeText={(t) => { setEmail(t); setStatusMessage(null); }}
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            onChangeText={(t) => { setPassword(t); setStatusMessage(null); }}
            value={password}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.peekButton}>
            <Text style={styles.peekText}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        {isSignUp && (
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm Password"
              onChangeText={(t) => { setConfirmPassword(t); setStatusMessage(null); }}
              value={confirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </View>
        )}
      </View>

      <View style={styles.buttons}>
        {loading ? (
          <ActivityIndicator size="large" color="#4a90e2" />
        ) : (
          <>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={isSignUp ? signUpWithEmail : signInWithEmail}
            >
              <Text style={styles.primaryButtonText}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setIsSignUp(!isSignUp);
                setStatusMessage(null);
              }}
            >
              <Text style={styles.secondaryButtonText}>
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  peekButton: {
    padding: 16,
  },
  peekText: {
    color: '#4a90e2',
    fontWeight: 'bold',
  },
  buttons: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#4a90e2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4a90e2',
    fontSize: 14,
    fontWeight: '500',
  },
  statusCard: {
    padding: 14,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
  },
  statusCardError: {
    backgroundColor: '#fde8e8',
    borderColor: '#f8b4b4',
  },
  statusCardSuccess: {
    backgroundColor: '#def7ec',
    borderColor: '#bcf0da',
  },
  statusCardText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
  statusCardTextError: {
    color: '#9b1c1c',
  },
  statusCardTextSuccess: {
    color: '#03543f',
  },
});
