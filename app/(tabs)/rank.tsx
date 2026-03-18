import { Feather } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";

import Colors, { RANK_COLORS } from "@/constants/colors";
import { Rank, Stats, useSystem } from "@/context/SystemContext";

const { width } = Dimensions.get("window");

interface RankTier {
  rank: Rank;
  label: string;
  minScore: number;
  maxScore: number | null;
  description: string;
  power: string;
  titles: string[];
}

const RANK_TIERS: RankTier[] = [
  {
    rank: "E",
    label: "E-Rank",
    minScore: 0,
    maxScore: 79,
    description: "The beginning. Every legend starts here. You are weak — but aware.",
    power: "Beginner",
    titles: ["Awakened"],
  },
  {
    rank: "D",
    label: "D-Rank",
    minScore: 80,
    maxScore: 139,
    description: "Your body is responding. The System has noticed your effort.",
    power: "Initiate",
    titles: ["Iron Body", "First Blood"],
  },
  {
    rank: "C",
    label: "C-Rank",
    minScore: 140,
    maxScore: 219,
    description: "You are no longer ordinary. Most will never reach this point.",
    power: "Advanced",
    titles: ["Bronze Hunter", "Relentless"],
  },
  {
    rank: "B",
    label: "B-Rank",
    minScore: 220,
    maxScore: 319,
    description: "A genuine threat. Your stats speak before you enter the room.",
    power: "Elite",
    titles: ["Silver Hunter", "Disciplined"],
  },
  {
    rank: "A",
    label: "A-Rank",
    minScore: 320,
    maxScore: 449,
    description: "Top 1% of all hunters. Your potential is no longer in question.",
    power: "Expert",
    titles: ["Gold Hunter", "Veteran", "Peak Performer"],
  },
  {
    rank: "S",
    label: "S-Rank",
    minScore: 450,
    maxScore: 599,
    description: "Legendary. A force of nature. The weak part ways at your arrival.",
    power: "Legend",
    titles: ["S-Rank", "Sovereign Body", "Apex Hunter"],
  },
  {
    rank: "SS",
    label: "SS-Rank",
    minScore: 600,
    maxScore: 799,
    description: "Beyond human limits. You have defied what biology allows.",
    power: "Transcendent",
    titles: ["Transcendent", "The Immovable", "Shadow Monarch"],
  },
  {
    rank: "SSS",
    label: "SSS-Rank",
    minScore: 800,
    maxScore: null,
    description: "The System bows to you. There is no ceiling left to break.",
    power: "GOD-TIER",
    titles: ["Monarch of All", "System Override", "Beyond Limits"],
  },
];

const RANK_ORDER: Rank[] = ["E", "D", "C", "B", "A", "S", "SS", "SSS"];

function getCurrentScore(stats: Stats, level: number): number {
  return Object.values(stats).reduce((a, b) => a + b, 0) + level * 5;
}

function RankBadge({ rank, size = 56, active = false }: { rank: Rank; size?: number; active?: boolean }) {
  const color = Colors.dark.rankColors[rank];
  const fontSize = rank.length === 3 ? size * 0.28 : rank.length === 2 ? size * 0.32 : size * 0.38;

  return (
    <View
      style={[
        badgeStyles.badge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.22,
          backgroundColor: active ? `${color}20` : `${color}10`,
          borderColor: active ? color : `${color}50`,
          borderWidth: active ? 2.5 : 1.5,
          shadowColor: active ? color : "transparent",
          shadowOpacity: active ? 0.6 : 0,
          shadowRadius: active ? 12 : 0,
          elevation: active ? 8 : 0,
        },
      ]}
    >
      <Text
        style={[
          badgeStyles.rankText,
          { color: active ? color : `${color}70`, fontSize },
        ]}
      >
        {rank}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: {
    fontFamily: "Inter_900Black",
    letterSpacing: 1,
  },
});

function HeroSection({ rank, score, stats, level }: { rank: Rank; score: number; stats: Stats; level: number }) {
  const color = Colors.dark.rankColors[rank];
  const tier = RANK_TIERS.find((t) => t.rank === rank)!;
  const rankIdx = RANK_ORDER.indexOf(rank);
  const nextRank = RANK_ORDER[rankIdx + 1] as Rank | undefined;
  const nextTier = nextRank ? RANK_TIERS.find((t) => t.rank === nextRank) : null;
  const nextMin = nextTier?.minScore ?? null;
  const progress = nextMin ? Math.min(1, (score - tier.minScore) / (nextMin - tier.minScore)) : 1;

  return (
    <View style={[heroStyles.card, { borderColor: `${color}40` }]}>
      <View style={heroStyles.glowBg} pointerEvents="none">
        <View style={[heroStyles.glow, { backgroundColor: `${color}08` }]} />
      </View>

      <View style={heroStyles.top}>
        <View>
          <Text style={heroStyles.label}>CURRENT RANK</Text>
          <Text style={[heroStyles.rankName, { color }]}>{tier.label}</Text>
          <Text style={heroStyles.power}>{tier.power}</Text>
        </View>
        <RankBadge rank={rank} size={80} active />
      </View>

      <Text style={heroStyles.desc}>{tier.description}</Text>

      <View style={heroStyles.scoreLine}>
        <View style={heroStyles.scoreBox}>
          <Text style={heroStyles.scoreNum}>{score}</Text>
          <Text style={heroStyles.scoreLabel}>Power Score</Text>
        </View>
        <View style={heroStyles.divider} />
        <View style={heroStyles.scoreBox}>
          <Text style={heroStyles.scoreNum}>{level}</Text>
          <Text style={heroStyles.scoreLabel}>Level</Text>
        </View>
        <View style={heroStyles.divider} />
        <View style={heroStyles.scoreBox}>
          <Text style={heroStyles.scoreNum}>{Object.values(stats).reduce((a, b) => a + b, 0)}</Text>
          <Text style={heroStyles.scoreLabel}>Stat Total</Text>
        </View>
      </View>

      {nextRank && nextMin !== null ? (
        <View style={heroStyles.progressSection}>
          <View style={heroStyles.progressRow}>
            <Text style={heroStyles.progressLabel}>Progress to {nextRank}-Rank</Text>
            <Text style={[heroStyles.progressPct, { color }]}>{Math.round(progress * 100)}%</Text>
          </View>
          <View style={heroStyles.progressTrack}>
            <View
              style={[
                heroStyles.progressFill,
                { width: `${progress * 100}%`, backgroundColor: color },
              ]}
            />
          </View>
          <Text style={heroStyles.progressNeeded}>
            {nextMin - score} more points needed
          </Text>
        </View>
      ) : (
        <View style={heroStyles.maxedRow}>
          <Feather name="award" size={14} color={color} />
          <Text style={[heroStyles.maxedText, { color }]}>You have reached the pinnacle. There is no higher rank.</Text>
        </View>
      )}
    </View>
  );
}

const heroStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    overflow: "hidden",
    gap: 14,
  },
  glowBg: { position: "absolute", top: 0, left: 0, right: 0, height: 120 },
  glow: { flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  label: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 4,
  },
  rankName: {
    fontSize: 32,
    fontFamily: "Inter_900Black",
    letterSpacing: 1,
    marginBottom: 2,
  },
  power: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  desc: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    fontStyle: "italic",
  },
  scoreLine: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 12,
    padding: 14,
  },
  scoreBox: { flex: 1, alignItems: "center" },
  scoreNum: { color: Colors.dark.accent, fontSize: 22, fontFamily: "Inter_900Black" },
  scoreLabel: { color: Colors.dark.textMuted, fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  divider: { width: 1, height: 36, backgroundColor: Colors.dark.border },
  progressSection: { gap: 6 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressLabel: { color: Colors.dark.textSecondary, fontSize: 12, fontFamily: "Inter_700Bold" },
  progressPct: { fontSize: 14, fontFamily: "Inter_900Black" },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.dark.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: 3 },
  progressNeeded: { color: Colors.dark.textMuted, fontSize: 11, fontFamily: "Inter_400Regular" },
  maxedRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  maxedText: { fontSize: 13, fontFamily: "Inter_700Bold", flex: 1 },
});

function RankCard({ tier, currentRank, score }: { tier: RankTier; currentRank: Rank; score: number }) {
  const color = Colors.dark.rankColors[tier.rank];
  const currentIdx = RANK_ORDER.indexOf(currentRank);
  const tierIdx = RANK_ORDER.indexOf(tier.rank);
  const isActive = tier.rank === currentRank;
  const isAchieved = tierIdx <= currentIdx;
  const isLocked = tierIdx > currentIdx;

  return (
    <View
      style={[
        rcStyles.card,
        isActive && { borderColor: `${color}60`, backgroundColor: `${color}08` },
        isAchieved && !isActive && { opacity: 0.85 },
        isLocked && rcStyles.lockedCard,
      ]}
    >
      <View style={rcStyles.left}>
        <RankBadge rank={tier.rank} size={52} active={isActive} />
      </View>

      <View style={rcStyles.mid}>
        <View style={rcStyles.titleRow}>
          <Text style={[rcStyles.rankLabel, { color: isLocked ? Colors.dark.textMuted : color }]}>
            {tier.label}
          </Text>
          {isActive && (
            <View style={[rcStyles.activePill, { backgroundColor: `${color}25`, borderColor: `${color}60` }]}>
              <Text style={[rcStyles.activePillText, { color }]}>CURRENT</Text>
            </View>
          )}
          {isAchieved && !isActive && (
            <Feather name="check-circle" size={14} color={Colors.dark.success} />
          )}
          {isLocked && (
            <Feather name="lock" size={14} color={Colors.dark.textMuted} />
          )}
        </View>
        <Text style={[rcStyles.power, { color: isLocked ? Colors.dark.textMuted : Colors.dark.textSecondary }]}>
          {tier.power}
        </Text>
        <Text style={rcStyles.desc} numberOfLines={2}>
          {tier.description}
        </Text>
        <View style={rcStyles.scoreReq}>
          <Text style={rcStyles.scoreReqText}>
            Score: {tier.minScore}{tier.maxScore !== null ? `–${tier.maxScore}` : "+"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const rcStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 14,
    marginBottom: 10,
    gap: 14,
    alignItems: "flex-start",
  },
  lockedCard: {
    opacity: 0.5,
  },
  left: { paddingTop: 2 },
  mid: { flex: 1, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  rankLabel: { fontSize: 18, fontFamily: "Inter_900Black", letterSpacing: 0.5 },
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  activePillText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  power: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  desc: { color: Colors.dark.textMuted, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  scoreReq: { marginTop: 4 },
  scoreReqText: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});

function TitlesSection({ titles, rank }: { titles: string[]; rank: Rank }) {
  const color = Colors.dark.rankColors[rank];
  const earned = titles.length > 0;

  return (
    <View style={tsStyles.card}>
      <View style={tsStyles.header}>
        <Feather name="award" size={16} color={Colors.dark.accent} />
        <Text style={tsStyles.title}>TITLES EARNED</Text>
        <Text style={tsStyles.count}>{titles.length}</Text>
      </View>
      {earned ? (
        <View style={tsStyles.grid}>
          {titles.map((t) => (
            <View key={t} style={[tsStyles.pill, { borderColor: `${color}50`, backgroundColor: `${color}10` }]}>
              <Feather name="star" size={11} color={color} />
              <Text style={[tsStyles.pillText, { color }]}>{t}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={tsStyles.empty}>
          <Text style={tsStyles.emptyText}>
            Complete quests and reach higher ranks to earn titles.
          </Text>
        </View>
      )}
    </View>
  );
}

const tsStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 18,
    marginBottom: 16,
    gap: 14,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    flex: 1,
  },
  count: {
    color: Colors.dark.accent,
    fontSize: 14,
    fontFamily: "Inter_900Black",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  empty: {
    paddingVertical: 12,
    alignItems: "center",
  },
  emptyText: {
    color: Colors.dark.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});

function ScoreBreakdown({ stats, level }: { stats: Stats; level: number }) {
  const statTotal = Object.values(stats).reduce((a, b) => a + b, 0);
  const levelBonus = level * 5;
  const total = statTotal + levelBonus;

  const rows: { label: string; val: number; color: string }[] = [
    { label: "Strength", val: stats.strength, color: Colors.dark.statColors.strength },
    { label: "Endurance", val: stats.endurance, color: Colors.dark.statColors.endurance },
    { label: "Agility", val: stats.agility, color: Colors.dark.statColors.agility },
    { label: "Intelligence", val: stats.intelligence, color: Colors.dark.statColors.intelligence },
    { label: "Discipline", val: stats.discipline, color: Colors.dark.statColors.discipline },
    { label: "Health", val: stats.health, color: Colors.dark.statColors.health },
    { label: "Level Bonus", val: levelBonus, color: Colors.dark.accent },
  ];

  return (
    <View style={sbStyles.card}>
      <Text style={sbStyles.sectionTitle}>POWER SCORE BREAKDOWN</Text>
      {rows.map((r) => (
        <View key={r.label} style={sbStyles.row}>
          <Text style={sbStyles.rowLabel}>{r.label}</Text>
          <View style={sbStyles.barTrack}>
            <View
              style={[
                sbStyles.barFill,
                { width: `${Math.min(100, (r.val / Math.max(total, 1)) * 100)}%`, backgroundColor: r.color },
              ]}
            />
          </View>
          <Text style={[sbStyles.rowVal, { color: r.color }]}>+{r.val}</Text>
        </View>
      ))}
      <View style={sbStyles.totalRow}>
        <Text style={sbStyles.totalLabel}>TOTAL</Text>
        <Text style={sbStyles.totalVal}>{total}</Text>
      </View>
    </View>
  );
}

const sbStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 18,
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 4,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowLabel: { color: Colors.dark.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular", width: 90 },
  barTrack: { flex: 1, height: 5, backgroundColor: Colors.dark.border, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 5, borderRadius: 3 },
  rowVal: { fontSize: 13, fontFamily: "Inter_700Bold", width: 40, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  totalLabel: { color: Colors.dark.textMuted, fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  totalVal: { color: Colors.dark.accent, fontSize: 22, fontFamily: "Inter_900Black" },
});

export default function RankScreen() {
  const { state } = useSystem();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const score = getCurrentScore(state.stats, state.level);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topPadding + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>RANK SYSTEM</Text>

      <HeroSection rank={state.rank} score={score} stats={state.stats} level={state.level} />

      <TitlesSection titles={state.titles} rank={state.rank} />

      <ScoreBreakdown stats={state.stats} level={state.level} />

      <Text style={styles.allRanksTitle}>ALL RANKS</Text>
      {RANK_TIERS.map((tier) => (
        <RankCard key={tier.rank} tier={tier} currentRank={state.rank} score={score} />
      ))}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: 20 },
  screenTitle: {
    color: Colors.dark.text,
    fontSize: 22,
    fontFamily: "Inter_900Black",
    letterSpacing: 2,
    marginBottom: 20,
  },
  allRanksTitle: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 12,
  },
});
