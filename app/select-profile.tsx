import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors, { RANK_COLORS } from "@/constants/colors";
import { useProfile, Profile } from "@/context/ProfileContext";

function ProfileCard({
  profile,
  onSelect,
  onDelete,
}: {
  profile: Profile;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const rankColor = RANK_COLORS[profile.rank as keyof typeof RANK_COLORS] ?? Colors.dark.accent;
  const initial = profile.name.charAt(0).toUpperCase();

  return (
    <TouchableOpacity style={styles.profileCard} onPress={onSelect} activeOpacity={0.8}>
      <View style={[styles.avatar, { borderColor: rankColor }]}>
        <Text style={[styles.avatarLetter, { color: rankColor }]}>{initial}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{profile.name}</Text>
        <View style={styles.cardMeta}>
          <View style={[styles.rankPill, { borderColor: `${rankColor}80` }]}>
            <Text style={[styles.rankPillText, { color: rankColor }]}>
              Rank {profile.rank}
            </Text>
          </View>
          <Text style={styles.levelText}>Lv. {profile.level}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="trash-2" size={16} color={Colors.dark.danger} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function SelectProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profiles, createProfile, switchProfile, deleteProfile } = useProfile();
  const [showCreate, setShowCreate] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [creating, setCreating] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSelect = async (profile: Profile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await switchProfile(profile.id);
    router.replace("/(tabs)");
  };

  const handleCreate = async () => {
    const name = nameInput.trim();
    if (!name) return;
    setCreating(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await createProfile(name);
    setShowCreate(false);
    setNameInput("");
    setCreating(false);
    router.replace("/onboarding");
  };

  const handleDelete = (profile: Profile) => {
    Alert.alert(
      "Delete Profile",
      `Delete "${profile.name}"? All progress will be lost forever.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteProfile(profile.id);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Text style={styles.logoLetter}>S</Text>
        </View>
        <Text style={styles.title}>THE SYSTEM</Text>
        <Text style={styles.subtitle}>Choose your hunter identity</Text>
      </View>

      {/* Profile list */}
      {profiles.length > 0 ? (
        <FlatList
          data={profiles}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.sectionLabel}>SELECT HUNTER</Text>
          }
          renderItem={({ item }) => (
            <ProfileCard
              profile={item}
              onSelect={() => handleSelect(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      ) : (
        <View style={styles.emptySection}>
          <Feather name="user-plus" size={48} color={Colors.dark.textMuted} />
          <Text style={styles.emptyTitle}>No Hunters Yet</Text>
          <Text style={styles.emptyText}>
            Create your first identity to begin your journey
          </Text>
        </View>
      )}

      {/* Create button */}
      <View style={[styles.bottom, { paddingBottom: botPad + 20 }]}>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Feather name="user-plus" size={20} color="#000" />
          <Text style={styles.createBtnText}>Create New Hunter</Text>
        </TouchableOpacity>
      </View>

      {/* Create modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>NEW HUNTER</Text>
            <Text style={styles.modalDesc}>
              Each hunter has their own progress, quests, and story.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Enter your name, Hunter"
              placeholderTextColor={Colors.dark.textMuted}
              autoFocus
              maxLength={24}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setShowCreate(false); setNameInput(""); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, (!nameInput.trim() || creating) && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={!nameInput.trim() || creating}
              >
                <Text style={styles.modalConfirmText}>
                  {creating ? "Creating..." : "Begin Journey"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { alignItems: "center", paddingTop: 40, paddingBottom: 36, paddingHorizontal: 20 },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: `${Colors.dark.accent}15`,
    borderWidth: 2,
    borderColor: Colors.dark.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoLetter: {
    color: Colors.dark.accent,
    fontSize: 36,
    fontFamily: "Inter_900Black",
  },
  title: {
    color: Colors.dark.accent,
    fontSize: 26,
    fontFamily: "Inter_900Black",
    letterSpacing: 6,
  },
  subtitle: {
    color: Colors.dark.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
    letterSpacing: 0.5,
  },
  sectionLabel: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 12,
  },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  emptySection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
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
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: Colors.dark.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: {
    fontSize: 24,
    fontFamily: "Inter_900Black",
  },
  cardInfo: { flex: 1 },
  cardName: {
    color: Colors.dark.text,
    fontSize: 18,
    fontFamily: "Inter_900Black",
    marginBottom: 6,
  },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  rankPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  rankPillText: {
    fontSize: 11,
    fontFamily: "Inter_900Black",
    letterSpacing: 0.5,
  },
  levelText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: `${Colors.dark.danger}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  bottom: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.background,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.dark.accent,
    borderRadius: 14,
    height: 54,
  },
  createBtnText: {
    color: "#000",
    fontFamily: "Inter_900Black",
    fontSize: 16,
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
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
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
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  modalBtnRow: { flexDirection: "row", gap: 12 },
  modalCancel: {
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
  modalConfirm: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.dark.accent,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#000",
    fontFamily: "Inter_900Black",
    fontSize: 15,
  },
});
