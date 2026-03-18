import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface Profile {
  id: string;
  name: string;
  createdAt: string;
  rank: string;
  level: number;
}

interface ProfileContextValue {
  profiles: Profile[];
  activeProfileId: string | null;
  isLoading: boolean;
  createProfile: (name: string) => Promise<string>;
  switchProfile: (id: string) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  updateProfileMeta: (id: string, rank: string, level: number) => void;
}

const PROFILES_KEY = "@system_profiles";
const ACTIVE_KEY = "@system_active_profile";

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [rawProfiles, rawActive] = await Promise.all([
        AsyncStorage.getItem(PROFILES_KEY),
        AsyncStorage.getItem(ACTIVE_KEY),
      ]);
      const loaded: Profile[] = rawProfiles ? JSON.parse(rawProfiles) : [];
      setProfiles(loaded);
      if (rawActive && loaded.find((p) => p.id === rawActive)) {
        setActiveProfileId(rawActive);
      } else {
        setActiveProfileId(null);
      }
    } catch {}
    setIsLoading(false);
  };

  const saveProfiles = async (list: Profile[]) => {
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(list));
  };

  const createProfile = useCallback(async (name: string): Promise<string> => {
    const id =
      Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    const newProfile: Profile = {
      id,
      name,
      createdAt: new Date().toISOString(),
      rank: "E",
      level: 1,
    };
    const updated = [...profiles, newProfile];
    setProfiles(updated);
    await saveProfiles(updated);
    await AsyncStorage.setItem(ACTIVE_KEY, id);
    setActiveProfileId(id);
    return id;
  }, [profiles]);

  const switchProfile = useCallback(async (id: string) => {
    await AsyncStorage.setItem(ACTIVE_KEY, id);
    setActiveProfileId(id);
  }, []);

  const deleteProfile = useCallback(async (id: string) => {
    const updated = profiles.filter((p) => p.id !== id);
    setProfiles(updated);
    await saveProfiles(updated);
    await AsyncStorage.removeItem(`@the_system_state_${id}`);
    if (activeProfileId === id) {
      const next = updated[0]?.id ?? null;
      setActiveProfileId(next);
      if (next) await AsyncStorage.setItem(ACTIVE_KEY, next);
      else await AsyncStorage.removeItem(ACTIVE_KEY);
    }
  }, [profiles, activeProfileId]);

  const updateProfileMeta = useCallback(
    (id: string, rank: string, level: number) => {
      setProfiles((prev) => {
        const updated = prev.map((p) =>
          p.id === id ? { ...p, rank, level } : p
        );
        saveProfiles(updated);
        return updated;
      });
    },
    []
  );

  const value = useMemo(
    () => ({
      profiles,
      activeProfileId,
      isLoading,
      createProfile,
      switchProfile,
      deleteProfile,
      updateProfileMeta,
    }),
    [profiles, activeProfileId, isLoading, createProfile, switchProfile, deleteProfile, updateProfileMeta]
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be inside ProfileProvider");
  return ctx;
}
