import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost } from "@/lib/api";

interface Category { id: string; name: string; color: string; icon: string; isDefault: boolean; }

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#64748b", "#0ea5e9",
];

export default function CategoriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[5]);

  const { data: categories = [], isLoading, isFetching, refetch } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiGet("/categories"),
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: (data: { name: string; color: string }) => apiPost("/categories", data),
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["categories"] });
      setShowAdd(false);
      setName("");
      setSelectedColor(PRESET_COLORS[5]);
    },
  });

  const handleCreate = () => {
    if (!name.trim()) return;
    create.mutate({ name: name.trim(), color: selectedColor });
  };

  const s = styles(colors, insets);

  const renderItem = ({ item: cat }: { item: Category }) => (
    <View style={s.row}>
      <View style={[s.colorBubble, { backgroundColor: cat.color }]}>
        <Feather name="tag" size={14} color="#ffffff" />
      </View>
      <Text style={s.catName}>{cat.name}</Text>
      {cat.isDefault && (
        <View style={s.defaultBadge}>
          <Text style={s.defaultText}>default</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={s.root}>
      <FlatList
        data={categories}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        contentContainerStyle={[s.list, categories.length === 0 && s.listEmpty]}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
        scrollEnabled={categories.length > 0}
        ListHeaderComponent={
          <View style={[s.listHeader, Platform.OS === "web" && s.listHeaderWeb]}>
            <Text style={s.headerTitle}>Categories</Text>
            <Pressable
              style={s.addBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAdd(true); }}
            >
              <Feather name="plus" size={18} color="#ffffff" />
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <View style={s.emptyBox}>
              <Feather name="tag" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No categories</Text>
              <Text style={s.emptySub}>Create categories to organize your spending.</Text>
            </View>
          )
        }
      />

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <View style={s.modal}>
          <View style={s.modalTop}>
            <Text style={s.modalTitle}>New category</Text>
            <Pressable onPress={() => setShowAdd(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <Text style={s.label}>Name</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Groceries"
            placeholderTextColor={colors.mutedForeground}
            autoFocus
            maxLength={40}
          />

          <Text style={s.label}>Color</Text>
          <View style={s.colorGrid}>
            {PRESET_COLORS.map((c) => (
              <Pressable
                key={c}
                style={[s.colorSwatch, { backgroundColor: c }, selectedColor === c && s.colorSwatchSelected]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedColor(c); }}
              >
                {selectedColor === c && <Feather name="check" size={14} color="#ffffff" />}
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[s.saveBtn, !name.trim() && s.saveBtnDisabled]}
            onPress={handleCreate}
            disabled={!name.trim() || create.isPending}
          >
            {create.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={s.saveBtnText}>Create category</Text>
            )}
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styles = (colors: any, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    list: { paddingBottom: insets.bottom + 100 },
    listEmpty: { flex: 1 },
    listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingTop: 16 },
    listHeaderWeb: { paddingTop: 80 },
    headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground },
    addBtn: { backgroundColor: colors.primary, borderRadius: 10, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    colorBubble: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    catName: { flex: 1, fontSize: 15, color: colors.foreground, fontFamily: "Inter_500Medium" },
    defaultBadge: { backgroundColor: colors.muted, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    defaultText: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
    emptyBox: { alignItems: "center", gap: 10, paddingVertical: 60 },
    emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    modal: { flex: 1, backgroundColor: colors.background, padding: 20 },
    modalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8, marginTop: 16 },
    input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 14, fontSize: 15, color: colors.foreground, backgroundColor: colors.card, fontFamily: "Inter_400Regular" },
    colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    colorSwatch: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    colorSwatchSelected: { borderWidth: 2.5, borderColor: colors.foreground },
    saveBtn: { marginTop: 28, backgroundColor: colors.primary, borderRadius: 12, height: 52, alignItems: "center", justifyContent: "center" },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: "#ffffff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  });
