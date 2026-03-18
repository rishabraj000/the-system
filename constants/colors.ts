const ACCENT = "#00d4ff";
const ACCENT_SECONDARY = "#7c3aed";
const DANGER = "#ef4444";
const SUCCESS = "#22c55e";
const WARNING = "#f59e0b";
const XP_COLOR = "#f59e0b";
const RANK_COLORS = {
  E: "#6b7280",
  D: "#10b981",
  C: "#3b82f6",
  B: "#8b5cf6",
  A: "#f59e0b",
  S: "#ef4444",
  SS: "#f97316",
  SSS: "#ec4899",
} as const;

export default {
  dark: {
    background: "#0a0a12",
    surface: "#12121e",
    surfaceElevated: "#1a1a2e",
    card: "#16213e",
    border: "#1e1e3f",
    borderLight: "#252550",
    text: "#e2e8f0",
    textSecondary: "#8892a4",
    textMuted: "#4a5568",
    accent: ACCENT,
    accentSecondary: ACCENT_SECONDARY,
    danger: DANGER,
    success: SUCCESS,
    warning: WARNING,
    xp: XP_COLOR,
    tint: ACCENT,
    tabIconDefault: "#4a5568",
    tabIconSelected: ACCENT,
    rankColors: RANK_COLORS,
    statColors: {
      strength: "#ef4444",
      endurance: "#f97316",
      agility: "#22c55e",
      intelligence: "#3b82f6",
      discipline: "#8b5cf6",
      health: "#ec4899",
    },
  },
};

export { ACCENT, ACCENT_SECONDARY, DANGER, SUCCESS, WARNING, XP_COLOR, RANK_COLORS };
