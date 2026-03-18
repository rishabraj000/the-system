import { router } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useProfile } from "@/context/ProfileContext";
import { useSystem } from "@/context/SystemContext";
import Colors from "@/constants/colors";

export default function Entry() {
  const { activeProfileId, isLoading: profileLoading } = useProfile();
  const { state, isLoading: systemLoading } = useSystem();

  useEffect(() => {
    if (profileLoading) return;

    // No profile exists → go to profile selector
    if (!activeProfileId) {
      router.replace("/select-profile");
      return;
    }

    if (systemLoading) return;

    // Profile exists but onboarding not done → onboarding
    if (!state.onboardingComplete) {
      router.replace("/onboarding");
    } else {
      router.replace("/(tabs)");
    }
  }, [profileLoading, systemLoading, activeProfileId, state.onboardingComplete]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.dark.accent} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
