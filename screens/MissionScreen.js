import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { supabase } from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export default function MissionScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Not logged in');
      }

      // Fetch Profile
      const profileRes = await fetch(`${API_URL}/api/profile`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
        if (!profileData.display_name) {
          navigation.replace('Onboarding');
          return;
        }
      }

      // Fetch today's mission if one exists
      const missionRes = await fetch(`${API_URL}/api/mission/today`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (missionRes.ok) {
        const missionData = await missionRes.json();
        if (missionData) {
          setMission(missionData);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMission = async () => {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${API_URL}/api/mission`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error('Failed to generate mission');
      }

      const missionData = await res.json();
      setMission(missionData);
    } catch (error) {
      Alert.alert('Error Generating Mission', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteMission = async () => {
    if (!mission) return;
    
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${API_URL}/api/mission/${mission.id}/complete`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to complete mission');
      }

      const data = await res.json();
      Alert.alert('🎉 Mission Accomplished!', `You earned +${data.reward} COOKIEs! Your streak is now active.`);
      
      // Reload profile to refresh balance & streak
      loadData();
      setMission({ ...mission, status: 'completed' });
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const getReadinessTier = (score) => {
    if (score >= 80) {
      return {
        label: 'Optimal Readiness',
        color: '#10B981',
        bgColor: 'rgba(16, 185, 129, 0.12)',
        desc: 'High neuromuscular capacity. Ready for high-intensity work.',
      };
    } else if (score >= 60) {
      return {
        label: 'Moderate Readiness',
        color: '#38BDF8',
        bgColor: 'rgba(56, 189, 248, 0.12)',
        desc: 'Steady baseline. Balanced progression recommended.',
      };
    } else {
      return {
        label: 'Recovery Focused',
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.12)',
        desc: 'Nervous system strain detected. Active recovery prescribed.',
      };
    }
  };

  const getMetricIcon = (type) => {
    switch (type) {
      case 'steps': return '👟';
      case 'water_ml': return '💧';
      case 'sleep_hours': return '😴';
      case 'active_mins': return '⏱️';
      default: return '🎯';
    }
  };

  const formatMetricLabel = (item) => {
    const icon = getMetricIcon(item.type);
    switch (item.type) {
      case 'steps': return `${icon} ${item.target.toLocaleString()} Steps`;
      case 'water_ml': return `${icon} ${item.target} ml Water`;
      case 'sleep_hours': return `${icon} ${item.target} hrs Sleep`;
      case 'active_mins': return `${icon} ${item.target} Active Mins`;
      default: return `${icon} ${item.target} ${item.type}`;
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#06B6D4" />
        <Text style={styles.loadingText}>Syncing with Coach Cookie...</Text>
      </View>
    );
  }

  const readinessTier = mission?.readiness_score ? getReadinessTier(mission.readiness_score) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.profileHeaderInfo}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View>
              <Text style={styles.greeting}>Hi, {profile?.display_name || 'Athlete'}!</Text>
              <Text style={styles.userSubtext}>
                {profile?.goal || 'General Health'} • {profile?.fitness_level || 'Beginner'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Cookie Vault & Streak HUD */}
        <View style={styles.hudCard}>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>COOKIE VAULT</Text>
            <View style={styles.hudValueRow}>
              <Text style={styles.cookieEmoji}>🍪</Text>
              <Text style={styles.cookieNumber}>{profile?.cookie_balance || 0}</Text>
            </View>
            <Text style={styles.hudBadge}>
              {(profile?.cookie_balance || 0) >= 100 ? 'Gold Athlete' : (profile?.cookie_balance || 0) >= 30 ? 'Silver Fit' : 'Bronze Baker'}
            </Text>
          </View>

          <View style={styles.hudDivider} />

          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>DAILY STREAK</Text>
            <View style={styles.hudValueRow}>
              <Text style={styles.fireEmoji}>🔥</Text>
              <Text style={styles.streakNumber}>{profile?.current_streak || 0}d</Text>
            </View>
            <Text style={styles.hudBestText}>Best: {profile?.best_streak || 0} days</Text>
          </View>
        </View>

        {/* ================= STATE 1: NO MISSION FOR TODAY ================= */}
        {!mission ? (
          <View style={styles.emptyStateCard}>
            <View style={styles.mascotBanner}>
              <View style={styles.mascotIconBox}>
                <Text style={styles.mascotBigEmoji}>🍪</Text>
              </View>
              <View style={styles.mascotStatus}>
                <View style={styles.statusDotRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>Coach Cookie Ready</Text>
                </View>
                <Text style={styles.emptyPromptTitle}>Ready for Today's Prescription?</Text>
              </View>
            </View>

            <Text style={styles.emptyPromptDesc}>
              Cookie evaluates your overnight recovery, heart rate trend, and goal baseline to build a single, high-impact mission tailored strictly to your physiology.
            </Text>

            {/* Vitals Calibration Grid */}
            <View style={styles.vitalsPreviewGrid}>
              <View style={styles.vitalMiniCard}>
                <Text style={styles.vitalMiniIcon}>😴</Text>
                <Text style={styles.vitalMiniLabel}>Sleep Depth</Text>
              </View>
              <View style={styles.vitalMiniCard}>
                <Text style={styles.vitalMiniIcon}>💓</Text>
                <Text style={styles.vitalMiniLabel}>Resting HR</Text>
              </View>
              <View style={styles.vitalMiniCard}>
                <Text style={styles.vitalMiniIcon}>📈</Text>
                <Text style={styles.vitalMiniLabel}>HRV Trend</Text>
              </View>
              <View style={styles.vitalMiniCard}>
                <Text style={styles.vitalMiniIcon}>👟</Text>
                <Text style={styles.vitalMiniLabel}>Activity Base</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.generateButton}
              onPress={handleGenerateMission}
              disabled={actionLoading}
              activeOpacity={0.85}
            >
              {actionLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#090D16" />
                  <Text style={styles.generateButtonText}>Analyzing Vitals with Gemini...</Text>
                </View>
              ) : (
                <Text style={styles.generateButtonText}>⚡ Analyze Vitals & Prescribe Mission</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* ================= STATE 2: ACTIVE / COMPLETED MISSION ================= */
          <View style={styles.missionCard}>
            
            {/* Readiness Gauge Header */}
            {readinessTier && (
              <View style={[styles.readinessBanner, { backgroundColor: readinessTier.bgColor }]}>
                <View style={styles.readinessScoreBox}>
                  <Text style={[styles.readinessScoreNumber, { color: readinessTier.color }]}>
                    {mission.readiness_score}
                  </Text>
                  <Text style={styles.readinessScoreMax}>/100</Text>
                </View>
                <View style={styles.readinessInfo}>
                  <Text style={[styles.readinessTitle, { color: readinessTier.color }]}>
                    {readinessTier.label}
                  </Text>
                  <Text style={styles.readinessDesc}>
                    {readinessTier.desc}
                  </Text>
                </View>
              </View>
            )}

            {/* Mission Category & Bounty Header */}
            <View style={styles.missionHeaderRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{mission.activity_category}</Text>
              </View>
              <View style={styles.rewardPill}>
                <Text style={styles.rewardEmoji}>🍪</Text>
                <Text style={styles.rewardText}>+{mission.cookie_reward} COOKIE</Text>
              </View>
            </View>

            {/* Mission Content */}
            <Text style={styles.missionTitle}>{mission.title}</Text>
            <Text style={styles.missionDesc}>{mission.description}</Text>

            {/* Target Metrics Chips */}
            {mission.target_metrics && Array.isArray(mission.target_metrics) && mission.target_metrics.length > 0 && (
              <View style={styles.targetMetricsSection}>
                <Text style={styles.targetMetricsHeader}>TARGET METRICS TO HIT</Text>
                <View style={styles.targetChipsRow}>
                  {mission.target_metrics.map((item, index) => (
                    <View key={index} style={styles.targetChip}>
                      <Text style={styles.targetChipText}>{formatMetricLabel(item)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Coach Cookie's Analysis & Daily Tip Card */}
            <View style={styles.coachAnalysisCard}>
              <View style={styles.coachHeaderRow}>
                <Text style={styles.coachAvatar}>🍪</Text>
                <Text style={styles.coachAnalysisTitle}>Coach Cookie's Prescription Rationale</Text>
              </View>
              <Text style={styles.coachAnalysisText}>"{mission.analysis_summary}"</Text>
            </View>

            {/* Completion Action */}
            {mission.status === 'completed' ? (
              <View style={styles.completedCard}>
                <Text style={styles.completedEmoji}>🎉</Text>
                <View style={styles.completedContent}>
                  <Text style={styles.completedTitle}>Mission Completed!</Text>
                  <Text style={styles.completedSubtitle}>
                    +{mission.cookie_reward} COOKIE earned & credited to your vault.
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.completeButton}
                onPress={handleCompleteMission}
                disabled={actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#090D16" />
                ) : (
                  <Text style={styles.completeButtonText}>✓ Mark Mission as Complete</Text>
                )}
              </TouchableOpacity>
            )}
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
    padding: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    backgroundColor: '#090D16',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#06B6D4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#06B6D4',
    fontSize: 18,
    fontWeight: '800',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  userSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  signOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  hudCard: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  hudItem: {
    flex: 1,
    alignItems: 'center',
  },
  hudDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#1F2937',
  },
  hudLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  hudValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cookieEmoji: {
    fontSize: 20,
  },
  cookieNumber: {
    color: '#FBBF24',
    fontSize: 24,
    fontWeight: '800',
  },
  fireEmoji: {
    fontSize: 20,
  },
  streakNumber: {
    color: '#F97316',
    fontSize: 24,
    fontWeight: '800',
  },
  hudBadge: {
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  hudBestText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  emptyStateCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 22,
  },
  mascotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  mascotIconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#2D3B55',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotBigEmoji: {
    fontSize: 30,
  },
  mascotStatus: {
    flex: 1,
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  onlineText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyPromptTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  emptyPromptDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },
  vitalsPreviewGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  vitalMiniCard: {
    flex: 1,
    backgroundColor: '#0A0F1D',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  vitalMiniIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  vitalMiniLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: '#06B6D4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  generateButtonText: {
    color: '#090D16',
    fontSize: 15,
    fontWeight: '800',
  },
  missionCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 22,
  },
  readinessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    gap: 14,
  },
  readinessScoreBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  readinessScoreNumber: {
    fontSize: 32,
    fontWeight: '800',
  },
  readinessScoreMax: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  readinessInfo: {
    flex: 1,
  },
  readinessTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  readinessDesc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  missionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryBadge: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  categoryText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  rewardEmoji: {
    fontSize: 14,
  },
  rewardText: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '800',
  },
  missionTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  missionDesc: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },
  targetMetricsSection: {
    marginBottom: 18,
  },
  targetMetricsHeader: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  targetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetChip: {
    backgroundColor: '#0A0F1D',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  targetChipText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  coachAnalysisCard: {
    backgroundColor: '#0A0F1D',
    borderLeftWidth: 3,
    borderLeftColor: '#06B6D4',
    borderRadius: 10,
    padding: 14,
    marginBottom: 22,
  },
  coachHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  coachAvatar: {
    fontSize: 16,
  },
  coachAnalysisTitle: {
    color: '#06B6D4',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  coachAnalysisText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  completeButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  completeButtonText: {
    color: '#090D16',
    fontSize: 16,
    fontWeight: '800',
  },
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  completedEmoji: {
    fontSize: 28,
  },
  completedContent: {
    flex: 1,
  },
  completedTitle: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  completedSubtitle: {
    color: '#34D399',
    fontSize: 12,
  },
});
