import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { supabase } from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const FITNESS_LEVELS = [
  {
    id: 'Beginner',
    label: 'Beginner',
    icon: '🌱',
    subtitle: 'Building healthy foundations',
    description: 'Gentle progressive movement, daily hydration, and restorative sleep targets.',
    bounty: '5 - 10 🍪 / mission',
  },
  {
    id: 'Intermediate',
    label: 'Intermediate',
    icon: '⚡',
    subtitle: 'Consistent momentum',
    description: 'Balanced cardio, strength challenges, and moderate recovery pacing.',
    bounty: '10 - 20 🍪 / mission',
  },
  {
    id: 'Advanced',
    label: 'Advanced',
    icon: '🔥',
    subtitle: 'Peak performance & capacity',
    description: 'High volume targets, strict HRV calibration, and intense conditioning.',
    bounty: '15 - 25 🍪 / mission',
  },
];

const GOALS = [
  {
    id: 'Weight Loss',
    label: 'Weight Loss',
    icon: '🔥',
    tag: 'Caloric Deficit & Burn',
    strategy: 'Prioritizes step volume, fat-oxidation walks, and elevated daily active minutes.',
  },
  {
    id: 'Build Muscle',
    label: 'Build Muscle',
    icon: '🏋️',
    tag: 'Hypertrophy & Strength',
    strategy: 'Focuses on resistance sessions, scheduled muscle recovery, and hydration.',
  },
  {
    id: 'General Health',
    label: 'General Health',
    icon: '🌿',
    tag: 'Longevity & Vitality',
    strategy: 'Balanced synergy of deep sleep, resting heart rate optimization, and steady movement.',
  },
];

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('Beginner');
  const [goal, setGoal] = useState('General Health');
  const [loading, setLoading] = useState(false);

  const handleNextStep1 = () => {
    if (!displayName.trim()) {
      Alert.alert('Missing Name', 'Please let Cookie know what to call you.');
      return;
    }
    const parsedAge = parseInt(age, 10);
    if (!age || isNaN(parsedAge) || parsedAge < 12 || parsedAge > 100) {
      Alert.alert('Invalid Age', 'Please enter a valid age between 12 and 100.');
      return;
    }
    setStep(2);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Not logged in. Please sign in again.');
      }

      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          display_name: displayName.trim(),
          age: parseInt(age, 10),
          fitness_level: fitnessLevel,
          goal: goal
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      // Profile updated successfully, navigate to main screen
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Profile Setup Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Progress Bar & Header */}
        <View style={styles.navHeader}>
          <View style={styles.progressContainer}>
            <View style={[styles.progressSegment, step >= 1 && styles.progressSegmentActive]} />
            <View style={[styles.progressSegment, step >= 2 && styles.progressSegmentActive]} />
            <View style={[styles.progressSegment, step >= 3 && styles.progressSegmentActive]} />
          </View>
          <Text style={styles.stepIndicatorText}>STEP {step} OF 3</Text>
        </View>

        {/* ================= STEP 1 ================= */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.mascotBadge}>
              <Text style={styles.mascotEmoji}>🍪</Text>
              <View>
                <Text style={styles.mascotName}>Coach Cookie</Text>
                <Text style={styles.mascotRole}>Biometric Health AI</Text>
              </View>
            </View>

            <Text style={styles.title}>Welcome to Cookie Fit!</Text>
            <Text style={styles.subtitle}>
              I evaluate your sleep, heart rate, and activity to prescribe smart daily missions that earn you real COOKIE rewards.
            </Text>

            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>What should Cookie call you?</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Alex"
                placeholderTextColor="#64748B"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputCard}>
              <View style={styles.labelWithBadge}>
                <Text style={styles.inputLabel}>Your Age</Text>
                <Text style={styles.whyBadge}>Calibrates Heart Rate</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g. 28"
                placeholderTextColor="#64748B"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.helperText}>
                Cookie uses your age to personalize cardiovascular training thresholds and recovery recommendations.
              </Text>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleNextStep1}>
              <Text style={styles.primaryButtonText}>Continue to Fitness Baseline ➔</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ================= STEP 2 ================= */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Calibrate Fitness Level</Text>
            <Text style={styles.subtitle}>
              Select your current baseline so Cookie assigns missions that challenge you safely without burnout.
            </Text>

            <View style={styles.cardsList}>
              {FITNESS_LEVELS.map((item) => {
                const isSelected = fitnessLevel === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.cardOption, isSelected && styles.cardOptionSelected]}
                    onPress={() => setFitnessLevel(item.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardIconBox}>
                        <Text style={styles.cardIcon}>{item.icon}</Text>
                      </View>
                      <View style={styles.cardTitleBox}>
                        <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
                          {item.label}
                        </Text>
                        <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                      </View>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                    </View>
                    <Text style={styles.cardDescription}>{item.description}</Text>
                    <View style={styles.bountyTag}>
                      <Text style={styles.bountyTagText}>Reward: {item.bounty}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={() => setStep(3)}>
                <Text style={styles.primaryButtonText}>Next: Choose Goal ➔</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ================= STEP 3 ================= */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Select Your Main Goal</Text>
            <Text style={styles.subtitle}>
              Cookie tailors every mission’s target metrics (steps, active minutes, hydration) to your primary objective.
            </Text>

            <View style={styles.cardsList}>
              {GOALS.map((item) => {
                const isSelected = goal === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.cardOption, isSelected && styles.cardOptionSelected]}
                    onPress={() => setGoal(item.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardIconBox}>
                        <Text style={styles.cardIcon}>{item.icon}</Text>
                      </View>
                      <View style={styles.cardTitleBox}>
                        <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
                          {item.label}
                        </Text>
                        <Text style={styles.goalTag}>{item.tag}</Text>
                      </View>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                    </View>
                    <Text style={styles.cardDescription}>{item.strategy}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Motivational Bounty Box */}
            <View style={styles.vaultPreviewBox}>
              <Text style={styles.vaultPreviewEmoji}>🍪</Text>
              <View style={styles.vaultPreviewContent}>
                <Text style={styles.vaultPreviewTitle}>First Mission Ready Today!</Text>
                <Text style={styles.vaultPreviewText}>
                  Complete your prescribed challenge today to earn your first +15 to +25 COOKIE reward and ignite your streak.
                </Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }, loading && styles.buttonDisabled]}
                onPress={handleSaveProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#090D16" />
                ) : (
                  <Text style={styles.primaryButtonText}>Start with Coach Cookie 🚀</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  content: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 48,
  },
  navHeader: {
    marginBottom: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1E293B',
  },
  progressSegmentActive: {
    backgroundColor: '#06B6D4',
  },
  stepIndicatorText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  stepContainer: {
    flex: 1,
  },
  mascotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131D31',
    borderColor: '#1E2D4A',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  mascotEmoji: {
    fontSize: 28,
  },
  mascotName: {
    color: '#F1F5F9',
    fontWeight: '700',
    fontSize: 15,
  },
  mascotRole: {
    color: '#06B6D4',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 22,
    marginBottom: 28,
  },
  inputCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  labelWithBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  whyBadge: {
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0A0F1D',
    borderWidth: 1,
    borderColor: '#2D3B55',
    borderRadius: 10,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  helperText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  cardsList: {
    gap: 14,
    marginBottom: 24,
  },
  cardOption: {
    backgroundColor: '#111827',
    borderWidth: 1.5,
    borderColor: '#1F2937',
    borderRadius: 14,
    padding: 18,
  },
  cardOptionSelected: {
    borderColor: '#06B6D4',
    backgroundColor: '#0F1E36',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardTitleBox: {
    flex: 1,
  },
  cardTitle: {
    color: '#F1F5F9',
    fontSize: 17,
    fontWeight: '700',
  },
  cardTitleSelected: {
    color: '#38BDF8',
  },
  cardSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  goalTag: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  cardDescription: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  bountyTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  bountyTagText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '700',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#06B6D4',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#06B6D4',
  },
  vaultPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    gap: 14,
  },
  vaultPreviewEmoji: {
    fontSize: 30,
  },
  vaultPreviewContent: {
    flex: 1,
  },
  vaultPreviewTitle: {
    color: '#FBBF24',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  vaultPreviewText: {
    color: '#D97706',
    fontSize: 12,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#06B6D4',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#090D16',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
