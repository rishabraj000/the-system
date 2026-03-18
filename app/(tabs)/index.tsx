import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { RANK_COLORS, XP_COLOR } from "@/constants/colors";
import { Rank, Stats, useSystem } from "@/context/SystemContext";

const STAT_ICONS: Record<keyof Stats, string> = {
  strength: "activity",
  endurance: "wind",
  agility: "zap",
  intelligence: "book",
  discipline: "shield",
  health: "heart",
};

const RANK_DESCRIPTIONS: Record<Rank, string> = {
  E: "Awakened Hunter",
  D: "Iron Class",
  C: "Bronze Class",
  B: "Silver Class",
  A: "Gold Class",
  S: "Shadow Monarch",
  SS: "Apex Predator",
  SSS: "The Absolute",
};

function StatBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  const maxStat = 999;
  const percent = Math.min(1, value / maxStat);
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: percent,
      duration: 800,
      useNativeDriver: false,
      delay: 100,
    }).start();
  }, [percent]);

  return (
    <View style={statStyles.container}>
      <View style={statStyles.header}>
        <View style={statStyles.labelRow}>
          <Feather name={icon as any} size={13} color={color} />
          <Text style={statStyles.label}>{label.toUpperCase()}</Text>
        </View>
        <Text style={[statStyles.value, { color }]}>{value}</Text>
      </View>
      <View style={statStyles.track}>
        <Animated.View
          style={[
            statStyles.fill,
            {
              backgroundColor: color,
              width: barAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  container: { marginBottom: 10 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  value: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  track: {
    height: 4,
    backgroundColor: Colors.dark.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
});

export default function StatusScreen() {
  const { state, getXpForNextLevel } = useSystem();
  const insets = useSafeAreaInsets();
  const xpNeeded = getXpForNextLevel(state.level);
  const xpPercent = Math.min(1, state.xp / xpNeeded);
  const rankColor = RANK_COLORS[state.rank];
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const xpBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Animated.timing(xpBarAnim, {
      toValue: xpPercent,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [xpPercent]);

  const completedToday = state.todayQuests.filter((q) => q.completed).length;
  const totalToday = state.todayQuests.length;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topPadding + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.hunterLabel}>HUNTER</Text>
          <Text style={styles.userName}>{state.userName}</Text>
        </View>
        <Animated.View style={[styles.rankBadge, { borderColor: rankColor, transform: [{ scale: pulseAnim }] }]}>
          <Text style={[styles.rankText, { color: rankColor }]}>{state.rank}</Text>
        </Animated.View>
      </View>

      <Text style={[styles.rankDesc, { color: rankColor }]}>
        {RANK_DESCRIPTIONS[state.rank]}
      </Text>

      <View style={styles.levelCard}>
        <View style={styles.levelRow}>
          <Text style={styles.levelLabel}>LEVEL</Text>
          <Text style={styles.levelNum}>{state.level}</Text>
          <View style={styles.streakBadge}>
            <Feather name="flame" size={13} color={Colors.dark.warning} />
            <Text style={styles.streakText}>{state.streak} day streak</Text>
          </View>
        </View>
        <View style={styles.xpBarTrack}>
          <Animated.View
            style={[
              styles.xpBarFill,
              {
                width: xpBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <View style={styles.xpRow}>
          <Text style={styles.xpLabel}>XP: {state.xp} / {xpNeeded}</Text>
          <Text style={styles.xpLabel}>Total: {state.totalXp} XP</Text>
        </View>
      </View>

      <View style={styles.questProgress}>
        <View style={styles.questProgressRow}>
          <Feather name="list" size={14} color={Colors.dark.textSecondary} />
          <Text style={styles.questProgressLabel}>TODAY'S QUESTS</Text>
          <Text style={[styles.questProgressCount, completedToday === totalToday && totalToday > 0 && styles.questComplete]}>
            {completedToday}/{totalToday}
          </Text>
        </View>
        <View style={styles.xpBarTrack}>
          <View
            style={[
              styles.questBarFill,
              { width: totalToday > 0 ? `${(completedToday / totalToday) * 100}%` : "0%" },
            ]}
          />
        </View>
      </View>

      <View style={styles.statsGrid}>
        <Text style={styles.sectionTitle}>STATS</Text>
        {(Object.keys(state.stats) as (keyof Stats)[]).map((key) => (
          <StatBar
            key={key}
            label={key}
            value={state.stats[key]}
            color={Colors.dark.statColors[key]}
            icon={STAT_ICONS[key]}
          />
        ))}
      </View>

      {state.titles.length > 0 && (
        <View style={styles.titlesSection}>
          <Text style={styles.sectionTitle}>TITLES</Text>
          <View style={styles.titlesRow}>
            {state.titles.map((title) => (
              <View key={title} style={styles.titleBadge}>
                <Text style={styles.titleText}>{title}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: Platform.OS === "web" ? 100 : 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    paddingHorizontal: 20,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  hunterLabel: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  userName: {
    color: Colors.dark.text,
    fontSize: 28,
    fontFamily: "Inter_900Black",
  },
  rankBadge: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: Colors.dark.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: {
    fontSize: 20,
    fontFamily: "Inter_900Black",
  },
  rankDesc: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    marginBottom: 20,
    textTransform: "uppercase",
  },
  levelCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 12,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  levelLabel: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  levelNum: {
    color: Colors.dark.accent,
    fontSize: 28,
    fontFamily: "Inter_900Black",
    marginRight: "auto",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  streakText: {
    color: Colors.dark.warning,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  xpBarTrack: {
    height: 6,
    backgroundColor: Colors.dark.border,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  xpBarFill: {
    height: 6,
    backgroundColor: XP_COLOR,
    borderRadius: 3,
  },
  xpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  xpLabel: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  questProgress: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 20,
  },
  questProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  questProgressLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    flex: 1,
  },
  questProgressCount: {
    color: Colors.dark.accent,
    fontSize: 14,
    fontFamily: "Inter_900Black",
  },
  questComplete: {
    color: Colors.dark.success,
  },
  questBarFill: {
    height: 6,
    backgroundColor: Colors.dark.accent,
    borderRadius: 3,
  },
  statsGrid: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 16,
  },
  sectionTitle: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 14,
  },
  titlesSection: {
    marginBottom: 16,
  },
  titlesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  titleBadge: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.dark.accentSecondary,
  },
  titleText: {
    color: Colors.dark.accentSecondary,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
});
