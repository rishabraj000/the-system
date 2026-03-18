import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { UserCapabilities, useSystem } from "@/context/SystemContext";

const { width } = Dimensions.get("window");

interface CapabilityField {
  key: keyof Omit<UserCapabilities, "customExercises">;
  label: string;
  subtitle: string;
  unit: string;
  placeholder: string;
  example: string;
  icon: string;
  color: string;
  min: number;
  max: number;
}

const FIELDS: CapabilityField[] = [
  {
    key: "pushUps",
    label: "Max Push-Ups",
    subtitle: "How many push-ups can you do without stopping?",
    unit: "reps",
    placeholder: "e.g. 20",
    example: "Avg: 15-30",
    icon: "activity",
    color: Colors.dark.statColors.strength,
    min: 0,
    max: 500,
  },
  {
    key: "pullUps",
    label: "Max Pull-Ups",
    subtitle: "Strict dead-hang pull-ups to failure",
    unit: "reps",
    placeholder: "e.g. 8",
    example: "Avg: 3-10",
    icon: "zap",
    color: Colors.dark.statColors.strength,
    min: 0,
    max: 100,
  },
  {
    key: "squats",
    label: "Max Squats",
    subtitle: "Bodyweight squats without rest",
    unit: "reps",
    placeholder: "e.g. 40",
    example: "Avg: 25-60",
    icon: "trending-up",
    color: Colors.dark.statColors.agility,
    min: 0,
    max: 1000,
  },
  {
    key: "sitUps",
    label: "Max Sit-Ups",
    subtitle: "Full range sit-ups to failure",
    unit: "reps",
    placeholder: "e.g. 30",
    example: "Avg: 20-50",
    icon: "refresh-cw",
    color: Colors.dark.statColors.health,
    min: 0,
    max: 500,
  },
  {
    key: "benchPressKg",
    label: "Bench Press 1RM",
    subtitle: "Maximum weight you can bench press once",
    unit: "kg",
    placeholder: "e.g. 60",
    example: "Avg: 40-80kg (0 if none)",
    icon: "bold",
    color: Colors.dark.statColors.strength,
    min: 0,
    max: 500,
  },
  {
    key: "runKm",
    label: "Run Without Stopping",
    subtitle: "Maximum distance you can run non-stop",
    unit: "km",
    placeholder: "e.g. 5",
    example: "Avg: 2-8km",
    icon: "wind",
    color: Colors.dark.statColors.endurance,
    min: 0,
    max: 100,
  },
  {
    key: "plankSecs",
    label: "Plank Hold",
    subtitle: "How long can you hold a plank?",
    unit: "seconds",
    placeholder: "e.g. 90",
    example: "Avg: 45-120 secs",
    icon: "clock",
    color: Colors.dark.statColors.discipline,
    min: 0,
    max: 3600,
  },
];

export default function OnboardingScreen() {
  const { completeOnboarding } = useSystem();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const totalSteps = FIELDS.length + 2;

  const animateTransition = (forward: boolean, callback: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: forward ? -30 : 30,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      slideAnim.setValue(forward ? 30 : -30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (step === 0 && name.trim().length < 2) return;
    animateTransition(true, () => setStep((s) => s + 1));
  };

  const handleBack = () => {
    if (step === 0) return;
    animateTransition(false, () => setStep((s) => s - 1));
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const caps: UserCapabilities = {
      pushUps: parseInt(values["pushUps"] || "0") || 0,
      pullUps: parseInt(values["pullUps"] || "0") || 0,
      squats: parseInt(values["squats"] || "0") || 0,
      sitUps: parseInt(values["sitUps"] || "0") || 0,
      benchPressKg: parseInt(values["benchPressKg"] || "0") || 0,
      runKm: parseFloat(values["runKm"] || "0") || 0,
      plankSecs: parseInt(values["plankSecs"] || "0") || 0,
      customExercises: [],
    };

    await completeOnboarding(name.trim(), caps);
    router.replace("/(tabs)");
  };

  const fieldIndex = step - 1;
  const isLastField = step === FIELDS.length;
  const currentField = step >= 1 && step <= FIELDS.length ? FIELDS[step - 1] : null;

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <View style={styles.logoContainer}>
        <View style={styles.hexagon}>
          <Text style={styles.hexText}>S</Text>
        </View>
      </View>
      <Text style={styles.systemTitle}>THE SYSTEM</Text>
      <Text style={styles.systemSubtitle}>
        A real-life RPG leveling system.{"\n"}Your journey begins now.
      </Text>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Your Name, Hunter</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name..."
          placeholderTextColor={Colors.dark.textMuted}
          value={name}
          onChangeText={setName}
          autoFocus
          maxLength={30}
          returnKeyType="next"
          onSubmitEditing={handleNext}
        />
      </View>
    </View>
  );

  const renderField = (field: CapabilityField) => (
    <View style={styles.stepContainer}>
      <View style={[styles.fieldIcon, { borderColor: field.color }]}>
        <Feather name={field.icon as any} size={28} color={field.color} />
      </View>
      <Text style={styles.fieldLabel}>{field.label}</Text>
      <Text style={styles.fieldSubtitle}>{field.subtitle}</Text>
      <Text style={[styles.fieldExample, { color: field.color }]}>{field.example}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={field.placeholder}
          placeholderTextColor={Colors.dark.textMuted}
          value={values[field.key] || ""}
          onChangeText={(t) =>
            setValues((v) => ({ ...v, [field.key]: t }))
          }
          keyboardType="numeric"
          autoFocus
          returnKeyType={isLastField ? "done" : "next"}
          onSubmitEditing={isLastField ? handleFinish : handleNext}
        />
        <Text style={styles.unitLabel}>{field.unit}</Text>
      </View>
    </View>
  );

  const renderSummary = () => {
    const caps: UserCapabilities = {
      pushUps: parseInt(values["pushUps"] || "0") || 0,
      pullUps: parseInt(values["pullUps"] || "0") || 0,
      squats: parseInt(values["squats"] || "0") || 0,
      sitUps: parseInt(values["sitUps"] || "0") || 0,
      benchPressKg: parseInt(values["benchPressKg"] || "0") || 0,
      runKm: parseFloat(values["runKm"] || "0") || 0,
      plankSecs: parseInt(values["plankSecs"] || "0") || 0,
      customExercises: [],
    };

    return (
      <View style={styles.stepContainer}>
        <View style={styles.summaryIcon}>
          <Feather name="check-circle" size={40} color={Colors.dark.success} />
        </View>
        <Text style={styles.fieldLabel}>System Calibrated</Text>
        <Text style={styles.fieldSubtitle}>
          Hunter {name}, your baseline has been recorded.{"\n"}The System will generate
          challenges tailored to your power level.
        </Text>
        <View style={styles.summaryList}>
          {FIELDS.map((f) => (
            <View key={f.key} style={styles.summaryRow}>
              <Feather name={f.icon as any} size={14} color={f.color} />
              <Text style={styles.summaryFieldName}>{f.label}</Text>
              <Text style={[styles.summaryValue, { color: f.color }]}>
                {values[f.key] || "0"} {f.unit}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const progress = step / (totalSteps - 1);
  const canContinue =
    step === 0
      ? name.trim().length >= 2
      : step <= FIELDS.length
      ? true
      : true;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.header}>
          {step > 0 ? (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Feather name="arrow-left" size={22} color={Colors.dark.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
          <Text style={styles.progress}>
            {step + 1} / {totalSteps}
          </Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[styles.progressBar, { width: `${progress * 100}%` }]}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
              flex: 1,
            }}
          >
            {step === 0 && renderWelcome()}
            {step >= 1 && step <= FIELDS.length && currentField && renderField(currentField)}
            {step === FIELDS.length + 1 && renderSummary()}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          {step < FIELDS.length + 1 ? (
            <TouchableOpacity
              style={[
                styles.nextButton,
                !canContinue && styles.nextButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={!canContinue}
            >
              <Text style={styles.nextButtonText}>
                {step === FIELDS.length ? "Review" : "Continue"}
              </Text>
              <Feather name="arrow-right" size={20} color="#000" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextButton, styles.finishButton]}
              onPress={handleFinish}
              disabled={isSubmitting}
            >
              <Text style={styles.nextButtonText}>
                {isSubmitting ? "Initializing..." : "ENTER THE SYSTEM"}
              </Text>
              <Feather name="zap" size={20} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  progress: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  progressBarContainer: {
    height: 2,
    backgroundColor: Colors.dark.border,
    marginHorizontal: 20,
    borderRadius: 1,
    marginBottom: 24,
  },
  progressBar: {
    height: 2,
    backgroundColor: Colors.dark.accent,
    borderRadius: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  stepContainer: {
    flex: 1,
    paddingTop: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  hexagon: {
    width: 80,
    height: 80,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.dark.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  hexText: {
    fontSize: 36,
    fontFamily: "Inter_900Black",
    color: Colors.dark.accent,
  },
  systemTitle: {
    fontSize: 28,
    fontFamily: "Inter_900Black",
    color: Colors.dark.accent,
    textAlign: "center",
    letterSpacing: 6,
    marginBottom: 12,
  },
  systemSubtitle: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
  },
  label: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  input: {
    flex: 1,
    height: 54,
    color: Colors.dark.text,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  unitLabel: {
    color: Colors.dark.textMuted,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginLeft: 8,
  },
  fieldIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: Colors.dark.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 24,
    fontFamily: "Inter_900Black",
    color: Colors.dark.text,
    marginBottom: 8,
  },
  fieldSubtitle: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  fieldExample: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  summaryIcon: {
    marginBottom: 20,
  },
  summaryList: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: "hidden",
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    gap: 10,
  },
  summaryFieldName: {
    flex: 1,
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  summaryValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  nextButton: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 14,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: "Inter_900Black",
    color: "#000",
    letterSpacing: 1,
  },
  finishButton: {
    backgroundColor: Colors.dark.success,
  },
});
