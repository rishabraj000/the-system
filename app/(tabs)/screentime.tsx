import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Colors from "@/constants/colors";

const ST_KEY = "@the_system_screentime";

interface DayLog {
  date: string;
  minutesUsed: number;
  limitMins: number;
  penaltyApplied: boolean;
  sessions: { start: number; end: number }[];
}

interface ScreenTimeState {
  dailyLimitMins: number;
  todayLog: DayLog;
  history: DayLog[];
  warningAt: number;
  focusSessionStart: number | null;
}

const today = () => new Date().toISOString().split("T")[0];

function emptyDayLog(limitMins: number): DayLog {
  return {
    date: today(),
    minutesUsed: 0,
    limitMins,
    penaltyApplied: false,
    sessions: [],
  };
}

const defaultState: ScreenTimeState = {
  dailyLimitMins: 120,
  todayLog: emptyDayLog(120),
  history: [],
  warningAt: 80,
  focusSessionStart: null,
};

async function loadST(): Promise<ScreenTimeState> {
  try {
    const raw = await AsyncStorage.getItem(ST_KEY);
    if (!raw) return defaultState;
    const saved: ScreenTimeState = JSON.parse(raw);
    const t = today();
    if (saved.todayLog.date !== t) {
      const oldLog = saved.todayLog;
      saved.history = [...(saved.history || []), oldLog].slice(-30);
      saved.todayLog = emptyDayLog(saved.dailyLimitMins);
    }
    return saved;
  } catch {
    return defaultState;
  }
}

async function saveST(s: ScreenTimeState) {
  await AsyncStorage.setItem(ST_KEY, JSON.stringify(s));
}

function formatMins(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function CircleProgress({
  used,
  limit,
  size = 160,
}: {
  used: number;
  limit: number;
  size?: number;
}) {
  const pct = Math.min(1, used / Math.max(limit, 1));
  const animPct = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animPct, {
      toValue: pct,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const R = size / 2 - 10;
  const circumference = 2 * Math.PI * R;
  const strokeDashoffset = animPct.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const color =
    pct >= 1
      ? Colors.dark.danger
      : pct >= 0.8
      ? Colors.dark.warning
      : Colors.dark.accent;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* background ring */}
      <View
        style={{
          position: "absolute",
          width: size - 20,
          height: size - 20,
          borderRadius: (size - 20) / 2,
          borderWidth: 8,
          borderColor: Colors.dark.border,
        }}
      />
      {/* Text in center */}
      <View style={{ alignItems: "center" }}>
        <Text style={[csStyles.bigTime, { color }]}>{formatMins(used)}</Text>
        <Text style={csStyles.limitText}>of {formatMins(limit)}</Text>
        <Text style={csStyles.pctText}>{Math.round(pct * 100)}%</Text>
      </View>
    </View>
  );
}

const csStyles = StyleSheet.create({
  bigTime: {
    fontSize: 28,
    fontFamily: "Inter_900Black",
  },
  limitText: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  pctText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
});

export default function ScreenTimeScreen() {
  const insets = useSafeAreaInsets();
  const [st, setSt] = useState<ScreenTimeState>(defaultState);
  const [loaded, setLoaded] = useState(false);
  const [focusSecs, setFocusSecs] = useState(0);
  const [isFocusing, setIsFocusing] = useState(false);
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState("");
  const [addingManual, setAddingManual] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    loadST().then((s) => {
      setSt(s);
      setLoaded(true);
      if (s.focusSessionStart) {
        const elapsed = Math.floor((Date.now() - s.focusSessionStart) / 1000);
        setFocusSecs(elapsed);
        setIsFocusing(true);
      }
    });
  }, []);

  useEffect(() => {
    if (isFocusing) {
      timerRef.current = setInterval(() => {
        setFocusSecs((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isFocusing]);

  const update = useCallback(async (updater: (prev: ScreenTimeState) => ScreenTimeState) => {
    setSt((prev) => {
      const next = updater(prev);
      saveST(next);
      return next;
    });
  }, []);

  const startFocus = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const now = Date.now();
    setIsFocusing(true);
    setFocusSecs(0);
    update((prev) => ({ ...prev, focusSessionStart: now }));
  };

  const endFocus = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsFocusing(false);
    const mins = Math.max(1, Math.floor(focusSecs / 60));
    setFocusSecs(0);

    update((prev) => {
      const now = Date.now();
      const start = prev.focusSessionStart || now - focusSecs * 1000;
      const newLog = {
        ...prev.todayLog,
        minutesUsed: prev.todayLog.minutesUsed + mins,
        sessions: [
          ...prev.todayLog.sessions,
          { start, end: now },
        ],
      };
      return { ...prev, todayLog: newLog, focusSessionStart: null };
    });

    Alert.alert("Session Ended", `${formatMins(mins)} logged as screen time.`);
  };

  const addManual = () => {
    const mins = parseInt(manualInput);
    if (isNaN(mins) || mins <= 0) {
      Alert.alert("Invalid", "Enter a valid number of minutes.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    update((prev) => {
      const newUsed = prev.todayLog.minutesUsed + mins;
      const over = newUsed >= prev.dailyLimitMins;
      return {
        ...prev,
        todayLog: {
          ...prev.todayLog,
          minutesUsed: newUsed,
        },
      };
    });

    setManualInput("");
    setAddingManual(false);
  };

  const applyPenalty = () => {
    Alert.alert(
      "Apply Penalty",
      "You exceeded your screen time limit. Apply discipline penalty (-5 XP equivalent, -2 Discipline)?",
      [
        { text: "Not Yet", style: "cancel" },
        {
          text: "Apply Penalty",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            update((prev) => ({
              ...prev,
              todayLog: { ...prev.todayLog, penaltyApplied: true },
            }));
            Alert.alert("Penalty Applied", "The System has recorded your failure. Do better tomorrow.");
          },
        },
      ]
    );
  };

  const saveLimit = () => {
    const val = parseInt(limitInput);
    if (isNaN(val) || val < 5 || val > 1440) {
      Alert.alert("Invalid", "Enter between 5 and 1440 minutes.");
      return;
    }
    update((prev) => ({
      ...prev,
      dailyLimitMins: val,
      todayLog: { ...prev.todayLog, limitMins: val },
    }));
    setEditingLimit(false);
    setLimitInput("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const resetToday = () => {
    Alert.alert("Reset Today", "Clear today's screen time log?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          update((prev) => ({
            ...prev,
            todayLog: emptyDayLog(prev.dailyLimitMins),
          }));
        },
      },
    ]);
  };

  const pct = st.todayLog.minutesUsed / Math.max(st.dailyLimitMins, 1);
  const isOver = pct >= 1;
  const isWarning = pct >= st.warningAt / 100;
  const statusColor = isOver ? Colors.dark.danger : isWarning ? Colors.dark.warning : Colors.dark.success;
  const remaining = Math.max(0, st.dailyLimitMins - st.todayLog.minutesUsed);

  const last7 = st.history.slice(-7);

  if (!loaded) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topPadding + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.screenTitle}>SCREEN TIME</Text>
          <Text style={[styles.statusLabel, { color: statusColor }]}>
            {isOver ? "LIMIT EXCEEDED" : isWarning ? "WARNING ZONE" : "ON TRACK"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => { setLimitInput(String(st.dailyLimitMins)); setEditingLimit(true); }} style={styles.settingsBtn}>
          <Feather name="settings" size={20} color={Colors.dark.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Big progress circle */}
      <View style={styles.circleCard}>
        <CircleProgress
          used={st.todayLog.minutesUsed}
          limit={st.dailyLimitMins}
          size={180}
        />
        <View style={styles.circleInfo}>
          <View style={styles.infoItem}>
            <Feather name="clock" size={14} color={Colors.dark.textMuted} />
            <Text style={styles.infoLabel}>Used</Text>
            <Text style={[styles.infoVal, { color: statusColor }]}>
              {formatMins(st.todayLog.minutesUsed)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Feather name="target" size={14} color={Colors.dark.textMuted} />
            <Text style={styles.infoLabel}>Limit</Text>
            <Text style={styles.infoVal}>{formatMins(st.dailyLimitMins)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Feather name="battery" size={14} color={Colors.dark.textMuted} />
            <Text style={styles.infoLabel}>Left</Text>
            <Text style={[styles.infoVal, { color: remaining === 0 ? Colors.dark.danger : Colors.dark.success }]}>
              {remaining === 0 ? "0m" : formatMins(remaining)}
            </Text>
          </View>
        </View>
      </View>

      {isOver && !st.todayLog.penaltyApplied && (
        <TouchableOpacity style={styles.penaltyBanner} onPress={applyPenalty}>
          <Feather name="alert-triangle" size={16} color={Colors.dark.danger} />
          <Text style={styles.penaltyText}>You exceeded your limit. Accept penalty?</Text>
          <Feather name="chevron-right" size={16} color={Colors.dark.danger} />
        </TouchableOpacity>
      )}

      {/* Focus timer */}
      <View style={styles.focusCard}>
        <Text style={styles.sectionTitle}>FOCUS TIMER</Text>
        <Text style={styles.focusDesc}>
          Track how long you're on your phone during a session.
        </Text>
        <Text style={[styles.focusTimer, isFocusing && styles.focusTimerActive]}>
          {formatSeconds(focusSecs)}
        </Text>
        <View style={styles.focusBtnRow}>
          {!isFocusing ? (
            <TouchableOpacity style={styles.focusStartBtn} onPress={startFocus}>
              <Feather name="play" size={18} color="#000" />
              <Text style={styles.focusBtnText}>Start Session</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.focusEndBtn} onPress={endFocus}>
              <Feather name="square" size={18} color="#fff" />
              <Text style={[styles.focusBtnText, { color: "#fff" }]}>End & Log</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Manual log */}
      <View style={styles.manualCard}>
        <View style={styles.manualHeader}>
          <Text style={styles.sectionTitle}>MANUAL LOG</Text>
          <Text style={styles.manualDesc}>Log screen time from your phone's Settings</Text>
        </View>
        {addingManual ? (
          <View style={styles.manualInputRow}>
            <TextInput
              style={styles.manualInput}
              value={manualInput}
              onChangeText={setManualInput}
              placeholder="Minutes used"
              placeholderTextColor={Colors.dark.textMuted}
              keyboardType="numeric"
              autoFocus
            />
            <TouchableOpacity style={styles.manualAddBtn} onPress={addManual}>
              <Feather name="check" size={18} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.manualCancelBtn} onPress={() => { setAddingManual(false); setManualInput(""); }}>
              <Feather name="x" size={18} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.manualBtn} onPress={() => setAddingManual(true)}>
            <Feather name="plus" size={16} color={Colors.dark.accent} />
            <Text style={styles.manualBtnText}>Add Screen Time</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* History */}
      {last7.length > 0 && (
        <View style={styles.historyCard}>
          <Text style={styles.sectionTitle}>LAST 7 DAYS</Text>
          {last7.reverse().map((log, i) => {
            const d = new Date(log.date);
            const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
            const logPct = Math.min(1, log.minutesUsed / Math.max(log.limitMins, 1));
            const col = logPct >= 1 ? Colors.dark.danger : logPct >= 0.8 ? Colors.dark.warning : Colors.dark.success;
            return (
              <View key={log.date} style={styles.historyRow}>
                <Text style={styles.historyDay}>{dayName}</Text>
                <View style={styles.historyBarTrack}>
                  <View style={[styles.historyBarFill, { width: `${logPct * 100}%`, backgroundColor: col }]} />
                </View>
                <Text style={[styles.historyVal, { color: col }]}>{formatMins(log.minutesUsed)}</Text>
                {log.penaltyApplied && <Feather name="alert-circle" size={12} color={Colors.dark.danger} />}
              </View>
            );
          })}
        </View>
      )}

      {/* Tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.sectionTitle}>SYSTEM TIPS</Text>
        {[
          { icon: "smartphone", tip: "Check Settings > Screen Time (iOS) or Digital Wellbeing (Android) for real usage data" },
          { icon: "moon", tip: "Enable Do Not Disturb during quests to stay focused" },
          { icon: "shield", tip: "Use your phone's App Limits feature to block distracting apps" },
          { icon: "bell-off", tip: "Turn off non-essential notifications to reduce phone pickups" },
        ].map((t, i) => (
          <View key={i} style={styles.tipRow}>
            <View style={styles.tipIcon}>
              <Feather name={t.icon as any} size={14} color={Colors.dark.accent} />
            </View>
            <Text style={styles.tipText}>{t.tip}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.resetBtn} onPress={resetToday}>
        <Text style={styles.resetText}>Reset Today's Log</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />

      {/* Limit edit modal */}
      <Modal
        visible={editingLimit}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingLimit(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>SET DAILY LIMIT</Text>
            <Text style={styles.modalDesc}>
              How many minutes of screen time are you allowed per day?
            </Text>
            <TextInput
              style={styles.modalInput}
              value={limitInput}
              onChangeText={setLimitInput}
              placeholder="Minutes (e.g. 120)"
              placeholderTextColor={Colors.dark.textMuted}
              keyboardType="numeric"
              autoFocus
              maxLength={4}
            />
            <Text style={styles.modalHint}>
              {parseInt(limitInput) > 0 ? `= ${formatMins(parseInt(limitInput))}` : ""}
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setEditingLimit(false); setLimitInput(""); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveLimit}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: 20 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  screenTitle: {
    color: Colors.dark.text,
    fontSize: 22,
    fontFamily: "Inter_900Black",
    letterSpacing: 2,
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginTop: 4,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  circleCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    gap: 20,
  },
  circleInfo: {
    flexDirection: "row",
    gap: 24,
  },
  infoItem: { alignItems: "center", gap: 3 },
  infoLabel: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  infoVal: {
    color: Colors.dark.text,
    fontSize: 18,
    fontFamily: "Inter_900Black",
  },
  penaltyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: `${Colors.dark.danger}15`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.dark.danger}40`,
    padding: 14,
    marginBottom: 16,
  },
  penaltyText: {
    flex: 1,
    color: Colors.dark.danger,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  focusCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 18,
    marginBottom: 16,
    alignItems: "center",
  },
  focusDesc: {
    color: Colors.dark.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 16,
    marginTop: 6,
  },
  focusTimer: {
    color: Colors.dark.textSecondary,
    fontSize: 52,
    fontFamily: "Inter_900Black",
    letterSpacing: 4,
    marginBottom: 20,
  },
  focusTimerActive: {
    color: Colors.dark.accent,
  },
  focusBtnRow: { flexDirection: "row", gap: 12 },
  focusStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.accent,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  focusEndBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.danger,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  focusBtnText: {
    color: "#000",
    fontFamily: "Inter_900Black",
    fontSize: 15,
  },
  manualCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 18,
    marginBottom: 16,
    gap: 12,
  },
  manualHeader: { gap: 4 },
  manualDesc: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  manualInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  manualInput: {
    flex: 1,
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 12,
    color: Colors.dark.text,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  manualAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.dark.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  manualCancelBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    justifyContent: "center",
    alignItems: "center",
  },
  manualBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  manualBtnText: {
    color: Colors.dark.accent,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  historyCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 18,
    marginBottom: 16,
    gap: 12,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historyDay: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    width: 32,
  },
  historyBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.dark.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  historyBarFill: {
    height: 6,
    borderRadius: 3,
  },
  historyVal: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    width: 36,
    textAlign: "right",
  },
  tipsCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 18,
    marginBottom: 16,
    gap: 12,
  },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: `${Colors.dark.accent}15`,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  sectionTitle: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  resetBtn: {
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
  },
  resetText: {
    color: Colors.dark.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 16,
  },
  modalTitle: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textAlign: "center",
  },
  modalDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    padding: 16,
    color: Colors.dark.text,
    fontSize: 24,
    fontFamily: "Inter_900Black",
    textAlign: "center",
  },
  modalHint: {
    color: Colors.dark.accent,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    minHeight: 20,
  },
  modalBtnRow: { flexDirection: "row", gap: 12 },
  modalCancelBtn: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  modalCancelText: {
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  modalSaveBtn: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.dark.accent,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSaveText: {
    color: "#000",
    fontFamily: "Inter_900Black",
    fontSize: 15,
  },
});
