import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Colors from "@/constants/colors";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type DayKey = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";
const ALL_DAYS: DayKey[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Alarm {
  id: string;
  label: string;
  hour: number;
  minute: number;
  days: DayKey[];
  enabled: boolean;
  notifIds: string[];
}

const ALARMS_KEY = "@the_system_alarms";

async function loadAlarms(): Promise<Alarm[]> {
  try {
    const raw = await AsyncStorage.getItem(ALARMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveAlarms(alarms: Alarm[]) {
  await AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
}

async function scheduleAlarm(alarm: Alarm): Promise<string[]> {
  const ids: string[] = [];
  const days = alarm.days.length === 0 ? ALL_DAYS : alarm.days;

  for (const day of days) {
    const dayIndex = ALL_DAYS.indexOf(day);
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `SYSTEM ALERT`,
          body: alarm.label || "Your alarm is going off.",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: dayIndex + 1,
          hour: alarm.hour,
          minute: alarm.minute,
        },
      });
      ids.push(id);
    } catch (e) {
      // fallback: skip
    }
  }
  return ids;
}

async function cancelAlarm(alarm: Alarm) {
  for (const id of alarm.notifIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function TimePickerModal({
  visible,
  initial,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  initial: { hour: number; minute: number };
  onConfirm: (h: number, m: number) => void;
  onCancel: () => void;
}) {
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [ampm, setAmpm] = useState<"AM" | "PM">(initial.hour >= 12 ? "PM" : "AM");

  const display12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

  const adjustHour = (delta: number) => {
    let h12 = display12 + delta;
    if (h12 > 12) h12 = 1;
    if (h12 < 1) h12 = 12;
    const newHour24 = ampm === "PM" ? (h12 === 12 ? 12 : h12 + 12) : h12 === 12 ? 0 : h12;
    setHour(newHour24);
  };

  const adjustMinute = (delta: number) => {
    setMinute((m) => {
      let nm = m + delta;
      if (nm >= 60) nm = 0;
      if (nm < 0) nm = 59;
      return nm;
    });
  };

  const toggleAmPm = () => {
    const next = ampm === "AM" ? "PM" : "AM";
    setAmpm(next);
    if (next === "PM" && hour < 12) setHour(hour + 12);
    if (next === "AM" && hour >= 12) setHour(hour - 12);
  };

  const handleConfirm = () => {
    onConfirm(hour, minute);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={tpStyles.overlay}>
        <View style={tpStyles.sheet}>
          <Text style={tpStyles.title}>SET ALARM TIME</Text>

          <View style={tpStyles.timeRow}>
            <View style={tpStyles.spinner}>
              <TouchableOpacity onPress={() => adjustHour(1)} style={tpStyles.arrow}>
                <Feather name="chevron-up" size={24} color={Colors.dark.accent} />
              </TouchableOpacity>
              <Text style={tpStyles.timeNum}>{pad(display12)}</Text>
              <TouchableOpacity onPress={() => adjustHour(-1)} style={tpStyles.arrow}>
                <Feather name="chevron-down" size={24} color={Colors.dark.accent} />
              </TouchableOpacity>
            </View>

            <Text style={tpStyles.colon}>:</Text>

            <View style={tpStyles.spinner}>
              <TouchableOpacity onPress={() => adjustMinute(1)} style={tpStyles.arrow}>
                <Feather name="chevron-up" size={24} color={Colors.dark.accent} />
              </TouchableOpacity>
              <Text style={tpStyles.timeNum}>{pad(minute)}</Text>
              <TouchableOpacity onPress={() => adjustMinute(-1)} style={tpStyles.arrow}>
                <Feather name="chevron-down" size={24} color={Colors.dark.accent} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={toggleAmPm} style={tpStyles.ampmBtn}>
              <Text style={tpStyles.ampmText}>{ampm}</Text>
            </TouchableOpacity>
          </View>

          <View style={tpStyles.btnRow}>
            <TouchableOpacity style={tpStyles.cancelBtn} onPress={onCancel}>
              <Text style={tpStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={tpStyles.confirmBtn} onPress={handleConfirm}>
              <Text style={tpStyles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const tpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  title: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 24,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 32,
  },
  spinner: { alignItems: "center", gap: 8 },
  arrow: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  timeNum: {
    color: Colors.dark.text,
    fontSize: 48,
    fontFamily: "Inter_900Black",
    letterSpacing: 2,
    minWidth: 70,
    textAlign: "center",
  },
  colon: {
    color: Colors.dark.accent,
    fontSize: 48,
    fontFamily: "Inter_900Black",
    marginTop: -8,
  },
  ampmBtn: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ampmText: {
    color: "#000",
    fontFamily: "Inter_900Black",
    fontSize: 16,
  },
  btnRow: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cancelText: {
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  confirmBtn: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.dark.accent,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmText: {
    color: "#000",
    fontFamily: "Inter_900Black",
    fontSize: 15,
  },
});

function AlarmCard({
  alarm,
  onToggle,
  onDelete,
  onEdit,
}: {
  alarm: Alarm;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const h = alarm.hour;
  const m = alarm.minute;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;

  return (
    <View style={acStyles.card}>
      <TouchableOpacity style={acStyles.main} onPress={onEdit} activeOpacity={0.8}>
        <View>
          <Text style={[acStyles.time, !alarm.enabled && acStyles.dimText]}>
            {pad(h12)}:{pad(m)}
            <Text style={acStyles.ampm}> {ampm}</Text>
          </Text>
          <Text style={[acStyles.label, !alarm.enabled && acStyles.dimText]}>
            {alarm.label || "Alarm"}
          </Text>
          <View style={acStyles.daysRow}>
            {ALL_DAYS.map((d) => (
              <View
                key={d}
                style={[
                  acStyles.dayDot,
                  alarm.days.includes(d) && alarm.enabled && acStyles.dayDotActive,
                ]}
              >
                <Text
                  style={[
                    acStyles.dayText,
                    alarm.days.includes(d) && alarm.enabled && acStyles.dayTextActive,
                  ]}
                >
                  {d[0]}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <View style={acStyles.right}>
          <Switch
            value={alarm.enabled}
            onValueChange={onToggle}
            trackColor={{ false: Colors.dark.border, true: `${Colors.dark.accent}80` }}
            thumbColor={alarm.enabled ? Colors.dark.accent : Colors.dark.textMuted}
          />
          <TouchableOpacity onPress={onDelete} style={acStyles.deleteBtn}>
            <Feather name="trash-2" size={16} color={Colors.dark.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const acStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 12,
    overflow: "hidden",
  },
  main: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  time: {
    color: Colors.dark.text,
    fontSize: 38,
    fontFamily: "Inter_900Black",
    letterSpacing: 1,
  },
  ampm: {
    fontSize: 18,
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_700Bold",
  },
  label: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    marginBottom: 10,
  },
  dimText: { opacity: 0.4 },
  daysRow: { flexDirection: "row", gap: 4 },
  dayDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.dark.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  dayDotActive: {
    backgroundColor: `${Colors.dark.accent}20`,
    borderColor: Colors.dark.accent,
  },
  dayText: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  dayTextActive: { color: Colors.dark.accent },
  right: { alignItems: "center", gap: 12 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: `${Colors.dark.danger}15`,
    justifyContent: "center",
    alignItems: "center",
  },
});

interface EditSheetProps {
  alarm: Alarm;
  visible: boolean;
  onSave: (updated: Alarm) => void;
  onCancel: () => void;
}

function EditSheet({ alarm, visible, onSave, onCancel }: EditSheetProps) {
  const [label, setLabel] = useState(alarm.label);
  const [days, setDays] = useState<DayKey[]>(alarm.days);
  const [hour, setHour] = useState(alarm.hour);
  const [minute, setMinute] = useState(alarm.minute);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const h = hour;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;

  const toggleDay = (d: DayKey) => {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const handleSave = () => {
    onSave({ ...alarm, label, days, hour, minute });
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
        <View style={esStyles.overlay}>
          <View style={esStyles.sheet}>
            <Text style={esStyles.sheetTitle}>CONFIGURE ALARM</Text>

            <TouchableOpacity
              style={esStyles.timeBig}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.8}
            >
              <Text style={esStyles.timeDisplay}>
                {pad(h12)}:{pad(minute)} {ampm}
              </Text>
              <Feather name="edit-2" size={16} color={Colors.dark.accent} />
            </TouchableOpacity>

            <View style={esStyles.field}>
              <Text style={esStyles.fieldLabel}>LABEL</Text>
              <TextInput
                style={esStyles.input}
                value={label}
                onChangeText={setLabel}
                placeholder="e.g. Morning Protocol"
                placeholderTextColor={Colors.dark.textMuted}
                maxLength={40}
              />
            </View>

            <View style={esStyles.field}>
              <Text style={esStyles.fieldLabel}>REPEAT</Text>
              <View style={esStyles.daysRow}>
                {ALL_DAYS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => toggleDay(d)}
                    style={[esStyles.dayBtn, days.includes(d) && esStyles.dayBtnActive]}
                  >
                    <Text
                      style={[esStyles.dayBtnText, days.includes(d) && esStyles.dayBtnTextActive]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={esStyles.btnRow}>
              <TouchableOpacity style={esStyles.cancelBtn} onPress={onCancel}>
                <Text style={esStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={esStyles.saveBtn} onPress={handleSave}>
                <Text style={esStyles.saveText}>Save Alarm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TimePickerModal
        visible={showTimePicker}
        initial={{ hour, minute }}
        onConfirm={(h, m) => {
          setHour(h);
          setMinute(m);
          setShowTimePicker(false);
        }}
        onCancel={() => setShowTimePicker(false)}
      />
    </>
  );
}

const esStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 20,
  },
  sheetTitle: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textAlign: "center",
  },
  timeBig: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
  },
  timeDisplay: {
    color: Colors.dark.accent,
    fontSize: 36,
    fontFamily: "Inter_900Black",
    letterSpacing: 2,
  },
  field: {},
  fieldLabel: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 14,
    color: Colors.dark.text,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  daysRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  dayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  dayBtnActive: {
    backgroundColor: `${Colors.dark.accent}20`,
    borderColor: Colors.dark.accent,
  },
  dayBtnText: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  dayBtnTextActive: { color: Colors.dark.accent },
  btnRow: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cancelText: {
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  saveBtn: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.dark.accent,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  saveText: {
    color: "#000",
    fontFamily: "Inter_900Black",
    fontSize: 15,
  },
});

export default function AlarmsScreen() {
  const insets = useSafeAreaInsets();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    requestPermissions();
    loadAlarms().then(setAlarms);
  }, []);

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setHasPermission(status === "granted");
  };

  const createAlarm = () => {
    const now = new Date();
    const newAlarm: Alarm = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      label: "Alarm",
      hour: now.getHours(),
      minute: now.getMinutes(),
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      enabled: true,
      notifIds: [],
    };
    setEditingAlarm(newAlarm);
  };

  const handleSave = async (updated: Alarm) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Cancel old notifications
    await cancelAlarm(updated);

    let finalAlarm = { ...updated, notifIds: [] as string[] };
    if (updated.enabled && hasPermission) {
      const ids = await scheduleAlarm(updated);
      finalAlarm.notifIds = ids;
    }

    setAlarms((prev) => {
      const exists = prev.find((a) => a.id === finalAlarm.id);
      const next = exists
        ? prev.map((a) => (a.id === finalAlarm.id ? finalAlarm : a))
        : [...prev, finalAlarm];
      saveAlarms(next);
      return next;
    });
    setEditingAlarm(null);
  };

  const handleToggle = async (alarm: Alarm) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = { ...alarm, enabled: !alarm.enabled, notifIds: [] as string[] };

    await cancelAlarm(alarm);
    if (updated.enabled && hasPermission) {
      updated.notifIds = await scheduleAlarm(updated);
    }

    setAlarms((prev) => {
      const next = prev.map((a) => (a.id === updated.id ? updated : a));
      saveAlarms(next);
      return next;
    });
  };

  const handleDelete = (alarm: Alarm) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Delete Alarm", `Delete "${alarm.label}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await cancelAlarm(alarm);
          setAlarms((prev) => {
            const next = prev.filter((a) => a.id !== alarm.id);
            saveAlarms(next);
            return next;
          });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <View>
          <Text style={styles.screenTitle}>ALARMS</Text>
          <Text style={styles.subtitle}>{alarms.length} alarm{alarms.length !== 1 ? "s" : ""} set</Text>
        </View>
        <TouchableOpacity onPress={createAlarm} style={styles.addBtn}>
          <Feather name="plus" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      {hasPermission === false && (
        <View style={styles.permBanner}>
          <Feather name="alert-triangle" size={16} color={Colors.dark.warning} />
          <Text style={styles.permText}>
            Notification permission denied. Alarms won't fire.
          </Text>
          <TouchableOpacity onPress={requestPermissions}>
            <Text style={styles.permLink}>Grant</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={alarms}
        keyExtractor={(a) => a.id}
        contentContainerStyle={[styles.list, alarms.length === 0 && styles.emptyList]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bell-off" size={44} color={Colors.dark.textMuted} />
            <Text style={styles.emptyTitle}>No Alarms Set</Text>
            <Text style={styles.emptyText}>
              Tap the + button to create your first alarm
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={createAlarm}>
              <Feather name="plus" size={18} color="#000" />
              <Text style={styles.emptyBtnText}>Create Alarm</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <AlarmCard
            alarm={item}
            onToggle={() => handleToggle(item)}
            onDelete={() => handleDelete(item)}
            onEdit={() => setEditingAlarm(item)}
          />
        )}
      />

      {editingAlarm && (
        <EditSheet
          alarm={editingAlarm}
          visible={!!editingAlarm}
          onSave={handleSave}
          onCancel={() => setEditingAlarm(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  screenTitle: {
    color: Colors.dark.text,
    fontSize: 22,
    fontFamily: "Inter_900Black",
    letterSpacing: 2,
  },
  subtitle: {
    color: Colors.dark.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  permBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${Colors.dark.warning}15`,
    margin: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.dark.warning}30`,
  },
  permText: {
    flex: 1,
    color: Colors.dark.warning,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  permLink: {
    color: Colors.dark.accent,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyList: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingTop: 80,
  },
  emptyTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  emptyText: {
    color: Colors.dark.textMuted,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.accent,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyBtnText: {
    color: "#000",
    fontFamily: "Inter_900Black",
    fontSize: 15,
  },
});
