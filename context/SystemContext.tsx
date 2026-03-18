import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Rank = "E" | "D" | "C" | "B" | "A" | "S" | "SS" | "SSS";

export interface Stats {
  strength: number;
  endurance: number;
  agility: number;
  intelligence: number;
  discipline: number;
  health: number;
}

export interface Exercise {
  name: string;
  maxReps: number;
  maxWeight?: number;
  unit: "reps" | "kg" | "mins" | "km";
}

export interface UserCapabilities {
  pushUps: number;
  pullUps: number;
  squats: number;
  sitUps: number;
  benchPressKg: number;
  runKm: number;
  plankSecs: number;
  customExercises: Exercise[];
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  statReward: Partial<Stats>;
  completed: boolean;
  type: "workout" | "cardio" | "study" | "habit";
  target: number;
  unit: string;
  isBonus?: boolean;
}

export interface HistoryEntry {
  date: string;
  stats: Stats;
  level: number;
  questsCompleted: number;
}

export interface SystemState {
  onboardingComplete: boolean;
  userName: string;
  level: number;
  xp: number;
  totalXp: number;
  rank: Rank;
  streak: number;
  lastActiveDate: string;
  stats: Stats;
  capabilities: UserCapabilities;
  todayQuests: Quest[];
  questDate: string;
  history: HistoryEntry[];
  titles: string[];
  profileSeed: number;
}

interface SystemContextValue {
  state: SystemState;
  isLoading: boolean;
  completeOnboarding: (name: string, capabilities: UserCapabilities) => Promise<void>;
  completeQuest: (questId: string) => Promise<void>;
  refreshDailyQuests: () => void;
  resetDay: () => Promise<void>;
  getXpForNextLevel: (level: number) => number;
  getRankFromStats: (stats: Stats, level: number) => Rank;
}

const defaultCapabilities: UserCapabilities = {
  pushUps: 20,
  pullUps: 5,
  squats: 30,
  sitUps: 30,
  benchPressKg: 60,
  runKm: 3,
  plankSecs: 60,
  customExercises: [],
};

const defaultStats: Stats = {
  strength: 10,
  endurance: 10,
  agility: 10,
  intelligence: 10,
  discipline: 10,
  health: 10,
};

function makeDefaultState(profileSeed: number): SystemState {
  return {
    onboardingComplete: false,
    userName: "Hunter",
    level: 1,
    xp: 0,
    totalXp: 0,
    rank: "E",
    streak: 1,
    lastActiveDate: "",
    stats: defaultStats,
    capabilities: defaultCapabilities,
    todayQuests: [],
    questDate: "",
    history: [],
    titles: [],
    profileSeed,
  };
}

export function getXpForNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function getRankFromStats(stats: Stats, level: number): Rank {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const score = total + level * 5;
  if (score >= 800) return "SSS";
  if (score >= 600) return "SS";
  if (score >= 450) return "S";
  if (score >= 320) return "A";
  if (score >= 220) return "B";
  if (score >= 140) return "C";
  if (score >= 80) return "D";
  return "E";
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

// Seeded PRNG - gives unique randomness per profile per day
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateDailyQuests(
  capabilities: UserCapabilities,
  level: number,
  dateStr: string,
  profileSeed: number
): Quest[] {
  // Combine date + level + unique profile seed for fully unique randomness
  const datePart = dateStr.split("-").reduce((a, b) => a + parseInt(b), 0);
  const combinedSeed = (datePart * 31337 + level * 1337 + profileSeed) | 0;
  const rand = seededRandom(combinedSeed);

  const scaleFactor = 1 + (level - 1) * 0.1;
  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  // XP scales more aggressively with level
  const xp = (base: number) => Math.floor(base + level * 8 + level * level * 0.5);

  const workoutPool: Quest[] = [
    {
      id: "push-" + dateStr,
      title: "Push-Up Challenge",
      description: `Complete ${clamp(Math.round(capabilities.pushUps * scaleFactor * 0.8), 5, 300)} push-ups`,
      xpReward: xp(30),
      statReward: { strength: 2, health: 1 },
      completed: false,
      type: "workout",
      target: clamp(Math.round(capabilities.pushUps * scaleFactor * 0.8), 5, 300),
      unit: "reps",
    },
    {
      id: "pull-" + dateStr,
      title: "Pull-Up Mastery",
      description: `Complete ${clamp(Math.round(capabilities.pullUps * scaleFactor * 0.85), 2, 80)} pull-ups`,
      xpReward: xp(40),
      statReward: { strength: 3 },
      completed: false,
      type: "workout",
      target: clamp(Math.round(capabilities.pullUps * scaleFactor * 0.85), 2, 80),
      unit: "reps",
    },
    {
      id: "squat-" + dateStr,
      title: "Squat Protocol",
      description: `Perform ${clamp(Math.round(capabilities.squats * scaleFactor * 0.9), 10, 400)} squats`,
      xpReward: xp(35),
      statReward: { strength: 2, agility: 1 },
      completed: false,
      type: "workout",
      target: clamp(Math.round(capabilities.squats * scaleFactor * 0.9), 10, 400),
      unit: "reps",
    },
    {
      id: "situp-" + dateStr,
      title: "Core Fortification",
      description: `Complete ${clamp(Math.round(capabilities.sitUps * scaleFactor * 0.85), 10, 300)} sit-ups`,
      xpReward: xp(30),
      statReward: { strength: 1, health: 2 },
      completed: false,
      type: "workout",
      target: clamp(Math.round(capabilities.sitUps * scaleFactor * 0.85), 10, 300),
      unit: "reps",
    },
    {
      id: "plank-" + dateStr,
      title: "Iron Will Plank",
      description: `Hold plank for ${clamp(Math.round(capabilities.plankSecs * scaleFactor), 30, 900)} seconds`,
      xpReward: xp(35),
      statReward: { discipline: 2, strength: 1 },
      completed: false,
      type: "workout",
      target: clamp(Math.round(capabilities.plankSecs * scaleFactor), 30, 900),
      unit: "secs",
    },
    {
      id: "dips-" + dateStr,
      title: "Dip Drill",
      description: `Complete ${clamp(Math.round(capabilities.pushUps * scaleFactor * 0.6), 5, 100)} dips`,
      xpReward: xp(32),
      statReward: { strength: 2, agility: 1 },
      completed: false,
      type: "workout",
      target: clamp(Math.round(capabilities.pushUps * scaleFactor * 0.6), 5, 100),
      unit: "reps",
    },
    {
      id: "burpee-" + dateStr,
      title: "Burpee Blitz",
      description: `Finish ${clamp(Math.round(20 * scaleFactor), 10, 100)} burpees`,
      xpReward: xp(45),
      statReward: { strength: 2, endurance: 2 },
      completed: false,
      type: "workout",
      target: clamp(Math.round(20 * scaleFactor), 10, 100),
      unit: "reps",
    },
    {
      id: "lunge-" + dateStr,
      title: "Lunge March",
      description: `Do ${clamp(Math.round(capabilities.squats * scaleFactor * 0.7), 10, 200)} lunges`,
      xpReward: xp(28),
      statReward: { agility: 2, health: 1 },
      completed: false,
      type: "workout",
      target: clamp(Math.round(capabilities.squats * scaleFactor * 0.7), 10, 200),
      unit: "reps",
    },
  ];

  const cardioPool: Quest[] = [
    {
      id: "run-" + dateStr,
      title: "Shadow Run",
      description: `Run ${(capabilities.runKm * scaleFactor * 0.7).toFixed(1)} km`,
      xpReward: xp(50),
      statReward: { endurance: 3, health: 1 },
      completed: false,
      type: "cardio",
      target: parseFloat((capabilities.runKm * scaleFactor * 0.7).toFixed(1)),
      unit: "km",
    },
    {
      id: "walk-" + dateStr,
      title: "10,000 Steps",
      description: "Walk 10,000 steps today",
      xpReward: xp(30),
      statReward: { endurance: 2, health: 1 },
      completed: false,
      type: "cardio",
      target: 10000,
      unit: "steps",
    },
    {
      id: "jump-" + dateStr,
      title: "Jump Rope Blitz",
      description: `Do ${clamp(Math.round(100 * scaleFactor), 50, 600)} jump ropes`,
      xpReward: xp(28),
      statReward: { agility: 2, endurance: 1 },
      completed: false,
      type: "cardio",
      target: clamp(Math.round(100 * scaleFactor), 50, 600),
      unit: "reps",
    },
    {
      id: "sprint-" + dateStr,
      title: "Sprint Protocol",
      description: `Complete ${clamp(Math.round(5 * scaleFactor), 3, 20)} x 100m sprints`,
      xpReward: xp(42),
      statReward: { agility: 3, endurance: 1 },
      completed: false,
      type: "cardio",
      target: clamp(Math.round(5 * scaleFactor), 3, 20),
      unit: "sprints",
    },
    {
      id: "bike-" + dateStr,
      title: "Cycling Mission",
      description: `Cycle ${clamp(Math.round(capabilities.runKm * scaleFactor * 2), 5, 60)} km`,
      xpReward: xp(38),
      statReward: { endurance: 3, agility: 1 },
      completed: false,
      type: "cardio",
      target: clamp(Math.round(capabilities.runKm * scaleFactor * 2), 5, 60),
      unit: "km",
    },
  ];

  const disciplinePool: Quest[] = [
    {
      id: "wake-" + dateStr,
      title: "Rise Protocol",
      description: "Wake up and complete your morning routine before 7am",
      xpReward: xp(20),
      statReward: { discipline: 3 },
      completed: false,
      type: "habit",
      target: 1,
      unit: "done",
    },
    {
      id: "study-" + dateStr,
      title: "Knowledge Acquisition",
      description: "Study or learn something new for 45 minutes",
      xpReward: xp(35),
      statReward: { intelligence: 3, discipline: 1 },
      completed: false,
      type: "study",
      target: 45,
      unit: "mins",
    },
    {
      id: "screen-" + dateStr,
      title: "Screen Detox",
      description: "Stay under 2 hours of social media/entertainment",
      xpReward: xp(25),
      statReward: { discipline: 2, intelligence: 1 },
      completed: false,
      type: "habit",
      target: 1,
      unit: "done",
    },
    {
      id: "sleep-" + dateStr,
      title: "Recovery Mode",
      description: "Get 7-9 hours of sleep tonight",
      xpReward: xp(20),
      statReward: { health: 3 },
      completed: false,
      type: "habit",
      target: 1,
      unit: "done",
    },
    {
      id: "meditate-" + dateStr,
      title: "Mind Calibration",
      description: "Meditate or deep breathe for 10 minutes",
      xpReward: xp(20),
      statReward: { discipline: 2, health: 1 },
      completed: false,
      type: "habit",
      target: 10,
      unit: "mins",
    },
    {
      id: "cold-" + dateStr,
      title: "Cold Shower Protocol",
      description: "End your shower with 2 minutes of cold water",
      xpReward: xp(30),
      statReward: { discipline: 3, health: 1 },
      completed: false,
      type: "habit",
      target: 1,
      unit: "done",
    },
    {
      id: "journal-" + dateStr,
      title: "System Log Entry",
      description: "Write in your journal or reflect for 15 minutes",
      xpReward: xp(18),
      statReward: { intelligence: 2, discipline: 1 },
      completed: false,
      type: "study",
      target: 15,
      unit: "mins",
    },
    {
      id: "nosnack-" + dateStr,
      title: "Clean Fuel Protocol",
      description: "Eat no junk food or sugar today",
      xpReward: xp(22),
      statReward: { health: 3, discipline: 1 },
      completed: false,
      type: "habit",
      target: 1,
      unit: "done",
    },
    {
      id: "water-" + dateStr,
      title: "Hydration Mission",
      description: "Drink at least 3 litres of water today",
      xpReward: xp(15),
      statReward: { health: 2 },
      completed: false,
      type: "habit",
      target: 3,
      unit: "litres",
    },
    {
      id: "read-" + dateStr,
      title: "Mind Expansion",
      description: "Read a book for 30 minutes",
      xpReward: xp(28),
      statReward: { intelligence: 3 },
      completed: false,
      type: "study",
      target: 30,
      unit: "mins",
    },
  ];

  // Shuffle pools using profile-unique randomness
  const shuffle = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const shuffledWorkouts = shuffle(workoutPool);
  const shuffledCardio = shuffle(cardioPool);
  const shuffledDiscipline = shuffle(disciplinePool);

  // Pick 2 workouts + 1 cardio + 2 discipline = 5 quests base
  const selected: Quest[] = [
    shuffledWorkouts[0],
    shuffledWorkouts[1],
    shuffledCardio[0],
    shuffledDiscipline[0],
    shuffledDiscipline[1],
  ].filter(Boolean);

  // Bonus quest unlocks at level 5+
  if (level >= 5) {
    selected.push({
      id: "bonus-" + dateStr,
      title: "SYSTEM BONUS QUEST",
      description: "Complete ALL daily quests for a massive bonus reward",
      xpReward: xp(100) + level * 25,
      statReward: {
        strength: 2,
        endurance: 2,
        agility: 2,
        intelligence: 2,
        discipline: 2,
        health: 2,
      },
      completed: false,
      type: "habit",
      target: 1,
      unit: "done",
      isBonus: true,
    });
  }

  return selected;
}

function calculateInitialStats(capabilities: UserCapabilities): Stats {
  const normalize = (val: number, min: number, max: number, multiplier: number) =>
    Math.min(50, Math.round(((val - min) / (max - min)) * multiplier + 5));

  return {
    strength: normalize(
      capabilities.pushUps + capabilities.pullUps * 3 + capabilities.benchPressKg / 10,
      0,
      100,
      40
    ),
    endurance: normalize(capabilities.runKm, 0, 20, 40),
    agility: normalize(capabilities.squats + capabilities.plankSecs / 10, 0, 60, 40),
    intelligence: 10,
    discipline: normalize(capabilities.plankSecs, 0, 300, 40),
    health: normalize(
      (capabilities.pushUps + capabilities.sitUps + capabilities.runKm * 5) / 3,
      0,
      60,
      40
    ),
  };
}

const SystemContext = createContext<SystemContextValue | null>(null);

interface SystemProviderProps {
  children: React.ReactNode;
  profileId: string;
  profileSeed: number;
  onMetaUpdate?: (rank: string, level: number) => void;
}

export function SystemProvider({ children, profileId, profileSeed, onMetaUpdate }: SystemProviderProps) {
  const storageKey = `@the_system_state_${profileId}`;
  const [state, setState] = useState<SystemState>(makeDefaultState(profileSeed));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setState(makeDefaultState(profileSeed));
    loadState();
  }, [profileId]);

  const loadState = async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const saved: SystemState = JSON.parse(raw);
        const today = getTodayString();

        if (saved.questDate !== today) {
          saved.todayQuests = generateDailyQuests(
            saved.capabilities,
            saved.level,
            today,
            saved.profileSeed ?? profileSeed
          );
          saved.questDate = today;

          const lastDate = saved.lastActiveDate;
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];

          if (lastDate === yesterdayStr) {
            saved.streak = (saved.streak || 0) + 1;
          } else if (lastDate !== today) {
            saved.streak = 1;
          }
        }

        if (!saved.profileSeed) saved.profileSeed = profileSeed;
        setState(saved);
        onMetaUpdate?.(saved.rank, saved.level);
      }
    } catch (e) {
      console.error("Failed to load state", e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveState = useCallback(async (newState: SystemState) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(newState));
      onMetaUpdate?.(newState.rank, newState.level);
    } catch (e) {
      console.error("Failed to save state", e);
    }
  }, [storageKey]);

  const completeOnboarding = useCallback(
    async (name: string, capabilities: UserCapabilities) => {
      const today = getTodayString();
      const initialStats = calculateInitialStats(capabilities);
      const quests = generateDailyQuests(capabilities, 1, today, profileSeed);

      const newState: SystemState = {
        ...makeDefaultState(profileSeed),
        onboardingComplete: true,
        userName: name,
        capabilities,
        stats: initialStats,
        todayQuests: quests,
        questDate: today,
        lastActiveDate: today,
        streak: 1,
        history: [{ date: today, stats: initialStats, level: 1, questsCompleted: 0 }],
      };

      setState(newState);
      await saveState(newState);
    },
    [profileSeed, saveState]
  );

  const completeQuest = useCallback(
    async (questId: string) => {
      setState((prev) => {
        const quest = prev.todayQuests.find((q) => q.id === questId);
        if (!quest || quest.completed) return prev;

        const updatedQuests = prev.todayQuests.map((q) =>
          q.id === questId ? { ...q, completed: true } : q
        );

        const allNonBonusCompleted = updatedQuests
          .filter((q) => !q.isBonus)
          .every((q) => q.completed);

        const finalQuests = updatedQuests.map((q) => {
          if (q.isBonus && allNonBonusCompleted && !q.completed) {
            return { ...q, completed: true };
          }
          return q;
        });

        const bonusQuest = finalQuests.find((q) => q.isBonus);
        const xpGain =
          quest.xpReward +
          (allNonBonusCompleted && bonusQuest ? bonusQuest.xpReward : 0);

        let remainingXp = prev.xp + xpGain;
        let newLevel = prev.level;

        while (remainingXp >= getXpForNextLevel(newLevel)) {
          remainingXp -= getXpForNextLevel(newLevel);
          newLevel++;
        }

        const newStats: Stats = { ...prev.stats };
        Object.entries(quest.statReward).forEach(([key, val]) => {
          const k = key as keyof Stats;
          newStats[k] = Math.min(999, (newStats[k] || 0) + (val || 0));
        });

        if (allNonBonusCompleted && bonusQuest) {
          Object.entries(bonusQuest.statReward).forEach(([key, val]) => {
            const k = key as keyof Stats;
            newStats[k] = Math.min(999, (newStats[k] || 0) + (val || 0));
          });
        }

        const newRank = getRankFromStats(newStats, newLevel);
        const today = getTodayString();
        const questsCompleted = finalQuests.filter((q) => q.completed).length;

        const existingHistory = prev.history.filter((h) => h.date !== today);
        const newHistory: HistoryEntry[] = [
          ...existingHistory,
          { date: today, stats: newStats, level: newLevel, questsCompleted },
        ];

        const titles = [...prev.titles];
        if (newLevel >= 10 && !titles.includes("Veteran")) titles.push("Veteran");
        if (prev.streak >= 7 && !titles.includes("Consistent")) titles.push("Consistent");
        if (newRank === "S" && !titles.includes("S-Rank")) titles.push("S-Rank");
        if (newLevel >= 20 && !titles.includes("Elite")) titles.push("Elite");
        if (newRank === "SS" && !titles.includes("Shadow Monarch")) titles.push("Shadow Monarch");

        const newState: SystemState = {
          ...prev,
          xp: remainingXp,
          totalXp: prev.totalXp + xpGain,
          level: newLevel,
          rank: newRank,
          stats: newStats,
          todayQuests: finalQuests,
          lastActiveDate: today,
          history: newHistory,
          titles,
        };

        saveState(newState);
        return newState;
      });
    },
    [saveState]
  );

  const refreshDailyQuests = useCallback(() => {
    const today = getTodayString();
    setState((prev) => {
      const quests = generateDailyQuests(
        prev.capabilities,
        prev.level,
        today + "_r" + Date.now(),
        prev.profileSeed
      );
      const newState = { ...prev, todayQuests: quests, questDate: today };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  const resetDay = useCallback(async () => {
    const today = getTodayString();
    setState((prev) => {
      const quests = generateDailyQuests(prev.capabilities, prev.level, today, prev.profileSeed);
      const newState = { ...prev, todayQuests: quests, questDate: today };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  const value = useMemo(
    () => ({
      state,
      isLoading,
      completeOnboarding,
      completeQuest,
      refreshDailyQuests,
      resetDay,
      getXpForNextLevel,
      getRankFromStats,
    }),
    [state, isLoading, completeOnboarding, completeQuest, refreshDailyQuests, resetDay]
  );

  return (
    <SystemContext.Provider value={value}>{children}</SystemContext.Provider>
  );
}

export function useSystem() {
  const ctx = useContext(SystemContext);
  if (!ctx) throw new Error("useSystem must be inside SystemProvider");
  return ctx;
}
