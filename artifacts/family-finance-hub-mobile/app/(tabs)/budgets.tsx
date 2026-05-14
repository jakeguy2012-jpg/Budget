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

interface Budget {
  id: string; categoryId: string; categoryName: string;
  categoryColor: string; month: string; planned: string;
}
interface Category { id: string; name: string; color: string; }
interface DashSummary {
  byCategory: Array<{ name: string; value: number; color: string }>;
}

const money = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function BudgetsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [planned, setPlanned] = useState("");
  const [showCatPicker, setShowCatPicker] = useState(false);

  const { data: budgets = [], isLoading, isFetching, refetch } = useQuery<Budget[]>({
    queryKey: ["budgets"],
    queryFn: () => apiGet("/budgets"),
    enabled: !!user,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiGet("/categories"),
    enabled: !!user,
  });

  const { data: summary } = useQuery<DashSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiGet("/dashboard/summary"),
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: (data: { categoryId: string; planned: number }) => apiPost("/budgets", data),
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setShowAdd(false);
      setSelectedCatId("");
      setPlanned("");
    },
  });

  const selectedCat = categories.find((c) => c.id === selectedCatId);

  const handleCreate = () => {
    if (!selectedCatId || !planned || isNaN(Number(planned))) return;
    create.mutate({ categoryId: selectedCatId, planned: Number(planned) });
  };

  const s = styles(colors, insets);

  const renderBudget = ({ item: budget }: { item: Budget }) => {
    const actual = summary?.byCategory.find((c) => c.name === budget.categoryName)?.value ?? 0;
    const plan = Number(budget.planned);
    const pct = plan ? Math.min((actual / plan) * 100, 100) : 0;
    const over = actual > plan;

    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.catRow}>
            <View style={[s.dot, { backgroundColor: budget.categoryColor }]} />
            <Text style={s.catName}>{budget.categoryName}</Text>
          </View>
          <Text style={[s.amounts, over && s.amountsOver]}>
            {money(actual)} / {money(plan)}
          </Text>
        </View>
        <View style={s.barBg}>
          <View
            style={[
              s.barFill,
              { width: `${pct}%` as unknown as number, backgroundColor: over ? colors.destructive : colors.success },
            ]}
          />
        </View>
        {over && (
          <Text style={s.overLabel}>Over budget by {money(actual - plan)}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={s.root}>
      <FlatList
        data={budgets}
        keyExtractor={(b) => b.id}
        renderItem={renderBudget}
        contentContainerStyle={[s.list, budgets.length === 0 && s.listEmpty]}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
        scrollEnabled={budgets.length > 0}
        ListHeaderComponent={
          <View style={[s.listHeader, Platform.OS === "web" && s.listHeaderWeb]}>
            <Text style={s.headerTitle}>Monthly budgets</Text>
            <Pressable
              style={s.addBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAdd(true); }}
            >
              <Feather name="plus" size={18} color={colors.primaryForeground} />
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.emptyBox}>
              <Feather name="bar-chart-2" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No budgets yet</Text>
              <Text style={s.emptySub}>Tap + to set a monthly spending limit for a category.</Text>
            </View>
          ) : (
            <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
          )
        }
      />

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <View style={s.modal}>
          <View style={s.modalTop}>
            <Text style={s.modalTitle}>New budget</Text>
            <Pressable onPress={() => setShowAdd(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <Text style={s.label}>Category</Text>
          <Pressable style={s.picker} onPress={() => setShowCatPicker(true)}>
            {selectedCat ? (
              <View style={s.pickerInner}>
                <View style={[s.dot, { backgroundColor: selectedCat.color }]} />
                <Text style={s.pickerText}>{selectedCat.name}</Text>
              </View>
            ) : (
              <Text style={s.pickerPlaceholder}>Select a category…</Text>
            )}
            <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
          </Pressable>

          <Text style={s.label}>Monthly budget ($)</Text>
          <TextInput
            style={s.input}
            value={planned}
            onChangeText={setPlanned}
            placeholder="0.00"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
          />

          <Pressable
            style={[s.saveBtn, (!selectedCatId || !planned) && s.saveBtnDisabled]}
            onPress={handleCreate}
            disabled={!selectedCatId || !planned || create.isPending}
          >
            {create.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={s.saveBtnText}>Save budget</Text>
            )}
          </Pressable>
        </View>

        <Modal visible={showCatPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCatPicker(false)}>
          <View style={s.modal}>
            <View style={s.modalTop}>
              <Text style={s.modalTitle}>Choose category</Text>
              <Pressable onPress={() => setShowCatPicker(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                style={s.catOption}
                onPress={() => { setSelectedCatId(cat.id); setShowCatPicker(false); }}
              >
                <View style={[s.dot, { backgroundColor: cat.color }]} />
                <Text style={[s.catOptionText, selectedCatId === cat.id && s.catOptionActive]}>{cat.name}</Text>
                {selectedCatId === cat.id && <Feather name="check" size={16} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        </Modal>
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
    card: { marginHorizontal: 16, marginBottom: 12, backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    catRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    catName: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
    amounts: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    amountsOver: { color: colors.destructive, fontFamily: "Inter_600SemiBold" },
    barBg: { height: 7, borderRadius: 4, backgroundColor: colors.muted, overflow: "hidden" },
    barFill: { height: 7, borderRadius: 4 },
    overLabel: { marginTop: 6, fontSize: 11, color: colors.destructive, fontFamily: "Inter_400Regular" },
    center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40 },
    emptyBox: { alignItems: "center", gap: 10, paddingVertical: 60 },
    emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 30 },
    modal: { flex: 1, backgroundColor: colors.background, padding: 20 },
    modalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 6, marginTop: 16 },
    picker: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 14, backgroundColor: colors.card },
    pickerInner: { flexDirection: "row", alignItems: "center", gap: 10 },
    pickerText: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular" },
    pickerPlaceholder: { fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 14, fontSize: 15, color: colors.foreground, backgroundColor: colors.card, fontFamily: "Inter_400Regular" },
    saveBtn: { marginTop: 24, backgroundColor: colors.primary, borderRadius: 12, height: 52, alignItems: "center", justifyContent: "center" },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: "#ffffff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
    catOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    catOptionText: { flex: 1, fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular" },
    catOptionActive: { fontFamily: "Inter_600SemiBold", color: colors.primary },
  });
