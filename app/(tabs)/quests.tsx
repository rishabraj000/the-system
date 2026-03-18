import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
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
import { Quest, useSystem } from "@/context/SystemContext";

const TYPE_ICONS: Record<Quest["type"], string> = {
  workout: "activity",
  cardio: "wind",
  study: "book",
  habit: "shield",
};

const TYPE_COLORS: Record<Quest["type"], string> = {
  workout: Colors.dark.statColors.strength,
  cardio: Colors.dark.statColors.endurance,
  study: Colors.dark.statColors.intelligence,
  habit: Colors.dark.statColors.discipline,
};

function QuestCard({ quest, onComplete }: { quest: Quest; onComplete: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const typeColor = quest.isBonus ? Colors.dark.warning : TYPE_COLORS[quest.type];
  const icon = quest.isBonus ? "star" : TYPE_ICONS[quest.type];

  const handlePress = () => {
    if (quest.completed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(() => onComplete());
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={quest.completed}
        activeOpacity={0.8}
        style={[
          styles.questCard,
          quest.completed && styles.questCompleted,
          quest.isBonus && styles.questBonus,
        ]}
      >
        <View style={[styles.questIconBox, { borderColor: typeColor, backgroundColor: `${typeColor}15` }]}>
          <Feather name={icon as any} size={20} color={quest.completed ? Colors.dark.textMuted : typeColor} />
        </View>

        <View style={styles.questBody}>
          <View style={styles.questTitleRow}>
            <Text style={[styles.questTitle, quest.completed && styles.questTitleDone]}>
              {quest.title}
            </Text>
            {quest.completed && (
              <View style={styles.doneCheck}>
                <Feather name="check" size={14} color={Colors.dark.success} />
              </View>
            )}
          </View>
          <Text style={[styles.questDesc, quest.completed && styles.questDescDone]}>
            {quest.description}
          </Text>
          <View style={styles.questMeta}>
            <View style={styles.xpBadge}>
              <Feather name="zap" size={11} color={Colors.dark.xp} />
              <Text style={styles.xpText}>{quest.xpReward} XP</Text>
            </View>
            {Object.entries(quest.statReward)
              .filter(([, v]) => (v || 0) > 0)
              .slice(0, 2)
              .map(([key, val]) => (
                <View key={key} style={styles.statBadge}>
                  <Text style={[styles.statBadgeText, { color: Colors.dark.statColors[key as keyof typeof Colors.dark.statColors] }]}>
                    +{val} {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Text>
                </View>
              ))}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function QuestsScreen() {
  const { state, completeQuest } = useSystem();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const pending = state.todayQuests.filter((q) => !q.completed && !q.isBonus);
  const bonus = state.todayQuests.filter((q) => q.isBonus);
  const completed = state.todayQuests.filter((q) => q.completed && !q.isBonus);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topPadding + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>DAILY QUESTS</Text>
          <Text style={styles.dateLabel}>{today}</Text>
        </View>
        <View style={styles.progressCircle}>
          <Text style={styles.progressNum}>
            {state.todayQuests.filter((q) => q.completed).length}
          </Text>
          <Text style={styles.progressDen}>/{state.todayQuests.length}</Text>
        </View>
      </View>

      {pending.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACTIVE</Text>
          {pending.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              onComplete={() => completeQuest(q.id)}
            />
          ))}
        </View>
      )}

      {bonus.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: Colors.dark.warning }]}>
            SYSTEM BONUS
          </Text>
          {bonus.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              onComplete={() => completeQuest(q.id)}
            />
          ))}
        </View>
      )}

      {completed.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>COMPLETED</Text>
          {completed.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              onComplete={() => completeQuest(q.id)}
            />
          ))}
        </View>
      )}

      {state.todayQuests.length === 0 && (
        <View style={styles.empty}>
          <Feather name="inbox" size={40} color={Colors.dark.textMuted} />
          <Text style={styles.emptyText}>No quests assigned</Text>
          <Text style={styles.emptySubtext}>The System will generate quests tomorrow</Text>
        </View>
      )}

      <View style={{ height: Platform.OS === "web" ? 100 : 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  screenTitle: {
    color: Colors.dark.text,
    fontSize: 22,
    fontFamily: "Inter_900Black",
    letterSpacing: 2,
  },
  dateLabel: {
    color: Colors.dark.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  progressCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.dark.accent,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: Colors.dark.surface,
  },
  progressNum: {
    color: Colors.dark.accent,
    fontSize: 16,
    fontFamily: "Inter_900Black",
  },
  progressDen: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  section: { marginBottom: 24 },
  sectionLabel: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 10,
  },
  questCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  questCompleted: {
    opacity: 0.5,
    borderColor: Colors.dark.border,
  },
  questBonus: {
    borderColor: `${Colors.dark.warning}50`,
    backgroundColor: `${Colors.dark.warning}08`,
  },
  questIconBox: {
    width: 44,
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  questBody: { flex: 1 },
  questTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  questTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  questTitleDone: {
    color: Colors.dark.textMuted,
    textDecorationLine: "line-through",
  },
  doneCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: `${Colors.dark.success}20`,
    justifyContent: "center",
    alignItems: "center",
  },
  questDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
    marginBottom: 10,
    lineHeight: 19,
  },
  questDescDone: {
    color: Colors.dark.textMuted,
  },
  questMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${Colors.dark.xp}15`,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${Colors.dark.xp}30`,
  },
  xpText: {
    color: Colors.dark.xp,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  statBadge: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    color: Colors.dark.textSecondary,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  emptySubtext: {
    color: Colors.dark.textMuted,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
