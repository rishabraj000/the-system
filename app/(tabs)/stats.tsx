import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { Stats, useSystem } from "@/context/SystemContext";
import { CustomRadarChart } from "@/components/RadarChart";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 40;

const STAT_KEYS: (keyof Stats)[] = [
  "strength",
  "endurance",
  "agility",
  "intelligence",
  "discipline",
  "health",
];

const STAT_ICONS: Record<keyof Stats, string> = {
  strength: "activity",
  endurance: "wind",
  agility: "zap",
  intelligence: "book",
  discipline: "shield",
  health: "heart",
};

type ChartType = "radar" | "line";

const chartConfig = {
  backgroundGradientFrom: Colors.dark.surface,
  backgroundGradientTo: Colors.dark.surface,
  color: (opacity = 1) => `rgba(0, 212, 255, ${opacity})`,
  labelColor: () => Colors.dark.textSecondary,
  strokeWidth: 2,
  decimalPlaces: 0,
  propsForDots: {
    r: "3",
    strokeWidth: "2",
    stroke: Colors.dark.accent,
  },
};

function StatCard({ statKey, value }: { statKey: keyof Stats; value: number }) {
  const color = Colors.dark.statColors[statKey];
  const percent = Math.min(100, (value / 999) * 100);
  return (
    <View style={statCardStyles.card}>
      <View style={[statCardStyles.iconBox, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
        <Feather name={STAT_ICONS[statKey] as any} size={20} color={color} />
      </View>
      <Text style={statCardStyles.label}>
        {statKey.charAt(0).toUpperCase() + statKey.slice(1)}
      </Text>
      <Text style={[statCardStyles.value, { color }]}>{value}</Text>
      <View style={statCardStyles.mini}>
        <View style={[statCardStyles.miniBar, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const statCardStyles = StyleSheet.create({
  card: {
    width: (CHART_WIDTH - 12) / 3,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 12,
    alignItems: "flex-start",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  value: {
    fontSize: 22,
    fontFamily: "Inter_900Black",
    marginBottom: 8,
  },
  mini: {
    width: "100%",
    height: 3,
    backgroundColor: Colors.dark.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  miniBar: { height: 3, borderRadius: 2 },
});

export default function StatsScreen() {
  const { state } = useSystem();
  const insets = useSafeAreaInsets();
  const [chartType, setChartType] = useState<ChartType>("radar");
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const last7 = state.history.slice(-7);

  const labels = last7.map((h) => {
    const d = new Date(h.date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const buildDataset = (key: keyof Stats, color: string) => ({
    data: last7.length >= 1 ? last7.map((h) => h.stats[key] ?? 0) : [0],
    color: () => color,
    strokeWidth: 2,
  });

  const lineData = {
    labels: labels.length >= 1 ? labels : ["Day 1"],
    datasets: [
      buildDataset("strength", Colors.dark.statColors.strength),
      buildDataset("endurance", Colors.dark.statColors.endurance),
      buildDataset("agility", Colors.dark.statColors.agility),
    ],
    legend: ["Strength", "Endurance", "Agility"],
  };

  const radarLabels = STAT_KEYS.map(
    (k) => k.charAt(0).toUpperCase() + k.slice(1).substring(0, 4)
  );

  const radarValues = STAT_KEYS.map((k) => state.stats[k]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topPadding + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>STATS TRACKER</Text>

      <View style={styles.cardGrid}>
        {STAT_KEYS.map((k) => (
          <StatCard key={k} statKey={k} value={state.stats[k]} />
        ))}
      </View>

      <View style={styles.chartToggle}>
        {(["radar", "line"] as ChartType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.toggleBtn, chartType === t && styles.toggleBtnActive]}
            onPress={() => setChartType(t)}
          >
            <Text style={[styles.toggleText, chartType === t && styles.toggleTextActive]}>
              {t === "line" ? "Progress" : "Radar"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.chartCard}>
        {chartType === "radar" ? (
          <>
            <Text style={styles.chartTitle}>POWER PROFILE</Text>
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <CustomRadarChart
                labels={radarLabels}
                values={radarValues}
                maxValue={Math.max(...radarValues, 50)}
                size={CHART_WIDTH - 40}
                color={Colors.dark.accent}
                fillColor="rgba(0,212,255,0.12)"
              />
            </View>
            <View style={styles.legend}>
              {STAT_KEYS.map((k) => (
                <View key={k} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.dark.statColors[k] }]} />
                  <Text style={styles.legendLabel}>{k.charAt(0).toUpperCase() + k.slice(1)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.chartTitle}>COMBAT STATS OVER TIME</Text>
            {last7.length >= 1 ? (
              <LineChart
                data={lineData}
                width={CHART_WIDTH - 32}
                height={180}
                chartConfig={chartConfig}
                bezier
                style={{ borderRadius: 10, marginLeft: -8 }}
                withDots
                withShadow={false}
                withInnerLines={false}
                withOuterLines={false}
              />
            ) : (
              <View style={styles.emptyChart}>
                <Feather name="trending-up" size={32} color={Colors.dark.textMuted} />
                <Text style={styles.emptyChartText}>
                  Complete quests to see your progress chart
                </Text>
              </View>
            )}
            <View style={styles.legend}>
              {[
                { label: "Strength", color: Colors.dark.statColors.strength },
                { label: "Endurance", color: Colors.dark.statColors.endurance },
                { label: "Agility", color: Colors.dark.statColors.agility },
              ].map((l) => (
                <View key={l.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                  <Text style={styles.legendLabel}>{l.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      <View style={styles.totalCard}>
        <View style={styles.totalItem}>
          <Text style={styles.totalNum}>{state.level}</Text>
          <Text style={styles.totalLabel}>Level</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalItem}>
          <Text style={styles.totalNum}>{state.totalXp}</Text>
          <Text style={styles.totalLabel}>Total XP</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalItem}>
          <Text style={styles.totalNum}>{state.streak}</Text>
          <Text style={styles.totalLabel}>Streak</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalItem}>
          <Text style={styles.totalNum}>{state.history.length}</Text>
          <Text style={styles.totalLabel}>Days Active</Text>
        </View>
      </View>

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
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
    justifyContent: "space-between",
  },
  chartToggle: {
    flexDirection: "row",
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: "hidden",
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: Colors.dark.accent,
  },
  toggleText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  toggleTextActive: {
    color: "#000",
  },
  chartCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  chartTitle: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 8,
  },
  emptyChart: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyChartText: {
    color: Colors.dark.textMuted,
    fontSize: 13,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  legend: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    flexWrap: "wrap",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  totalCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  totalItem: { flex: 1, alignItems: "center" },
  totalNum: {
    color: Colors.dark.accent,
    fontSize: 24,
    fontFamily: "Inter_900Black",
  },
  totalLabel: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  totalDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.dark.border,
  },
});
