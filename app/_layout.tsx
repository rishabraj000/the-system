import {
  Inter_400Regular,
  Inter_700Bold,
  Inter_900Black,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProfileProvider, useProfile } from "@/context/ProfileContext";
import { SystemProvider } from "@/context/SystemContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Wraps SystemProvider — always mounted so child tabs can safely call useSystem()
function SystemGate({ children }: { children: React.ReactNode }) {
  const { activeProfileId, profiles, updateProfileMeta, isLoading } = useProfile();

  const profile = profiles.find((p) => p.id === activeProfileId);
  const profileSeed = profile
    ? parseInt(profile.createdAt.replace(/\D/g, "").slice(-8), 10) || 42
    : 42;

  // Use a stable empty id when there's no profile so SystemProvider doesn't crash
  const effectiveId = activeProfileId ?? "__none__";

  return (
    <SystemProvider
      profileId={effectiveId}
      profileSeed={profileSeed}
      onMetaUpdate={
        activeProfileId
          ? (rank, level) => updateProfileMeta(activeProfileId, rank, level)
          : undefined
      }
    >
      {children}
    </SystemProvider>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="select-profile" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

function RootLayoutInner() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Inter_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ProfileProvider>
      <SystemGate>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </SystemGate>
    </ProfileProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <RootLayoutInner />
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
