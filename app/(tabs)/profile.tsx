import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

import Colors from "@/constants/colors";
import { RANK_COLORS } from "@/constants/colors";
import { Stats, useSystem } from "@/context/SystemContext";
import { useProfile } from "@/context/ProfileContext";

const CAP_LABELS: Record<string, string> = {
  pushUps: "Push-Ups",
  pullUps: "Pull-Ups",
  squats: "Squats",
  sitUps: "Sit-Ups",
  benchPressKg: "Bench Press",
  runKm: "Max Run",
  plankSecs: "Plank Hold",
};

const CAP_UNITS: Record<string, string> = {
  pushUps: "reps",
  pullUps: "reps",
  squats: "reps",
  sitUps: "reps",
  benchPressKg: "kg",
  runKm: "km",
  plankSecs: "secs",
};

const CAP_ICONS: Record<string, string> = {
  pushUps: "activity",
  pullUps: "zap",
  squats: "trending-up",
  sitUps: "refresh-cw",
  benchPressKg: "bold",
  runKm: "wind",
  plankSecs: "clock",
};

const STAT_COLORS: Record<keyof Stats, string> = {
  strength: Colors.dark.statColors.strength,
  endurance: Colors.dark.statColors.endurance,
  agility: Colors.dark.statColors.agility,
  intelligence: Colors.dark.statColors.intelligence,
  discipline: Colors.dark.statColors.discipline,
  health: Colors.dark.statColors.health,
};

export default function ProfileScreen() {
  const { state, refreshDailyQuests } = useSystem();
  const { activeProfileId, switchProfile, profiles } = useProfile();
  const insets = useSafeAreaInsets();
  const [showCaps, setShowCaps] = useState(false);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const rankColor = RANK_COLORS[state.rank];

  const handleSwitchProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/select-profile");
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Progress",
      "This will delete your current hunter's progress and restart onboarding. Other hunters are unaffected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            if (activeProfileId) {
              await AsyncStorage.removeItem(`@the_system_state_${activeProfileId}`);
            }
            router.replace("/onboarding");
          },
        },
      ]
    );
  };

  const handleRefreshQuests = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    refreshDailyQuests();
    Alert.alert("Quests Refreshed", "New daily quests have been generated.");
  };

  const questsCompleted = state.history.reduce(
    (acc, h) => acc + h.questsCompleted,
    0
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topPadding + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { borderColor: rankColor }]}>
          <Text style={[styles.avatarLetter, { color: rankColor }]}>
            {state.userName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{state.userName}</Text>
          <View style={styles.rankRow}>
            <View style={[styles.rankPill, { borderColor: rankColor }]}>
              <Text style={[styles.rankText, { color: rankColor }]}>
                Rank {state.rank}
              </Text>
            </View>
            <Text style={styles.levelText}>Lv. {state.level}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: "Streak", value: `${state.streak}d`, icon: "flame", color: Colors.dark.warning },
          { label: "Quests Done", value: questsCompleted, icon: "check-circle", color: Colors.dark.success },
          { label: "Days Active", value: state.history.length, icon: "calendar", color: Colors.dark.accent },
          { label: "Total XP", value: state.totalXp, icon: "zap", color: Colors.dark.xp },
        ].map((s) => (
          <View key={s.label} style={styles.statsItem}>
            <Feather name={s.icon as any} size={16} color={s.color} />
            <Text style={[styles.statsNum, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statsLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {state.titles.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>TITLES</Text>
          <View style={styles.titlesRow}>
            {state.titles.map((t) => (
              <View key={t} style={styles.titleBadge}>
                <Feather name="award" size={12} color={Colors.dark.accentSecondary} />
                <Text style={styles.titleText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.card}
        onPress={() => setShowCaps(!showCaps)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>BASE CAPABILITIES</Text>
          <Feather
            name={showCaps ? "chevron-up" : "chevron-down"}
            size={16}
            color={Colors.dark.textMuted}
          />
        </View>
        {showCaps && (
          <View style={styles.capList}>
            {Object.entries(CAP_LABELS).map(([key, label]) => {
              const val = state.capabilities[key as keyof typeof state.capabilities];
              if (typeof val !== "number") return null;
              return (
                <View key={key} style={styles.capRow}>
                  <Feather
                    name={CAP_ICONS[key] as any}
                    size={14}
                    color={Colors.dark.textSecondary}
                  />
                  <Text style={styles.capLabel}>{label}</Text>
                  <Text style={styles.capValue}>
                    {val} {CAP_UNITS[key]}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.actionsSection}>
        <Text style={styles.cardTitle}>SYSTEM CONTROLS</Text>

        <TouchableOpacity style={styles.actionBtn} onPress={handleSwitchProfile}>
          <View style={styles.actionLeft}>
            <View style={[styles.actionIcon, { backgroundColor: `${Colors.dark.accentSecondary}15` }]}>
              <Feather name="users" size={18} color={Colors.dark.accentSecondary} />
            </View>
            <View>
              <Text style={styles.actionLabel}>Switch Hunter</Text>
              <Text style={styles.actionSub}>Change or add a profile</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color={Colors.dark.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleRefreshQuests}>
          <View style={styles.actionLeft}>
            <View style={[styles.actionIcon, { backgroundColor: `${Colors.dark.accent}15` }]}>
              <Feather name="refresh-cw" size={18} color={Colors.dark.accent} />
            </View>
            <View>
              <Text style={styles.actionLabel}>Refresh Quests</Text>
              <Text style={styles.actionSub}>Generate new daily quests</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color={Colors.dark.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { marginBottom: 0, borderBottomWidth: 0 }]}
          onPress={handleReset}
        >
          <View style={styles.actionLeft}>
            <View style={[styles.actionIcon, { backgroundColor: `${Colors.dark.danger}15` }]}>
              <Feather name="trash-2" size={18} color={Colors.dark.danger} />
            </View>
            <View>
              <Text style={[styles.actionLabel, { color: Colors.dark.danger }]}>
                Reset This Hunter
              </Text>
              <Text style={styles.actionSub}>Restart this profile's progress</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color={Colors.dark.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>THE SYSTEM v1.0</Text>
        <Text style={styles.footerSub}>Your real-life leveling journey</Text>
      </View>

      <View style={{ height: Platform.OS === "web" ? 100 : 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: 20 },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: Colors.dark.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: {
    fontSize: 32,
    fontFamily: "Inter_900Black",
  },
  profileInfo: { flex: 1 },
  profileName: {
    color: Colors.dark.text,
    fontSize: 24,
    fontFamily: "Inter_900Black",
    marginBottom: 6,
  },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rankPill: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 3,
    backgroundColor: Colors.dark.surface,
  },
  rankText: {
    fontSize: 12,
    fontFamily: "Inter_900Black",
    letterSpacing: 1,
  },
  levelText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    marginBottom: 16,
    justifyContent: "space-between",
  },
  statsItem: { alignItems: "center", gap: 4 },
  statsNum: {
    fontSize: 17,
    fontFamily: "Inter_900Black",
  },
  statsLabel: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 12,
  },
  titlesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  titleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${Colors.dark.accentSecondary}15`,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: `${Colors.dark.accentSecondary}40`,
  },
  titleText: {
    color: Colors.dark.accentSecondary,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  capList: { marginTop: 12 },
  capRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  capLabel: {
    flex: 1,
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  capValue: {
    color: Colors.dark.accent,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  actionsSection: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    marginBottom: 16,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    marginBottom: 4,
  },
  actionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    color: Colors.dark.text,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  actionSub: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  footerText: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
  },
  footerSub: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
});
