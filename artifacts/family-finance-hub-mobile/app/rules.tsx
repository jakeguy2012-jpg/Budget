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
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface Category { id: string; name: string; color: string; }
interface Rule {
  id: string; categoryId: string; categoryName: string;
  merchantContains: string | null; descriptionContains: string | null;
  priority: number; excludeFromBudget: boolean; isActive: boolean;
}
interface Suggestion { merchantName: string | null; count: number; }
interface RulesPage { rules: Rule[]; categories: Category[]; suggestions: Suggestion[]; }

export default function RulesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [merchant, setMerchant] = useState("");
  const [desc, setDesc] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [showCatPicker, setShowCatPicker] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery<RulesPage>({
    queryKey: ["rules"],
    queryFn: () => apiGet("/rules"),
    enabled: !!user,
  });

  const rules = data?.rules ?? [];
  const categories = data?.categories ?? [];
  const suggestions = data?.suggestions ?? [];

  const create = useMutation({
    mutationFn: (d: { categoryId: string; merchantContains?: string; descriptionContains?: string }) =>
      apiPost("/rules", d),
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["rules"] });
      setShowAdd(false);
      setMerchant("");
      setDesc("");
      setCategoryId("");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
  });

  const applyRules = useMutation({
    mutationFn: () => apiPost<{ applied: number }>("/rules/apply", {}),
    onSuccess: async (res) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      if (Platform.OS !== "web") {
        Alert.alert("Rules applied", `${res.applied} transaction${res.applied !== 1 ? "s" : ""} categorized.`);
      }
    },
  });

  const approveSuggestion = (s: Suggestion, catId: string) => {
    create.mutate({ categoryId: catId, merchantContains: s.merchantName ?? undefined });
  };

  const confirmDelete = (id: string) => {
    if (Platform.OS === "web") { remove.mutate(id); return; }
    Alert.alert("Delete rule?", "This rule will no longer auto-categorize transactions.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(id) },
    ]);
  };

  const selectedCat = categories.find((c) => c.id === categoryId);
  const s = styles(colors, insets);

  const renderRule = ({ item: rule }: { item: Rule }) => (
    <View style={s.ruleCard}>
      <View style={s.ruleHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.ruleCat}>{rule.categoryName}</Text>
          {rule.merchantContains && (
            <Text style={s.ruleMatch}>Merchant: "{rule.merchantContains}"</Text>
          )}
          {rule.descriptionContains && (
            <Text style={s.ruleMatch}>Description: "{rule.descriptionContains}"</Text>
          )}
        </View>
        <Pressable onPress={() => confirmDelete(rule.id)} style={s.deleteBtn}>
          <Feather name="trash-2" size={15} color={colors.destructive} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={s.root}>
      <Stack.Screen options={{ title: "Rules" }} />
      <FlatList
        data={rules}
        keyExtractor={(r) => r.id}
        renderItem={renderRule}
        contentContainerStyle={[s.list, rules.length === 0 && s.listEmpty]}
        refreshing={isFetching && !isLoading}
        onRefresh={refetch}
        ListHeaderComponent={
          <View style={[s.listHeader, Platform.OS === "web" && s.listHeaderWeb]}>
            <View>
              <Text style={s.headerTitle}>Auto-categorization rules</Text>
              <Text style={s.headerSub}>Rules match merchants and descriptions to categories.</Text>
            </View>
            <View style={s.headerBtns}>
              <Pressable
                style={s.rerunBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); applyRules.mutate(); }}
                disabled={applyRules.isPending}
              >
                {applyRules.isPending
                  ? <ActivityIndicator color={colors.primary} size="small" />
                  : <Feather name="refresh-cw" size={15} color={colors.primary} />}
              </Pressable>
              <Pressable
                style={s.addBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAdd(true); }}
              >
                <Feather name="plus" size={18} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <View style={s.emptyBox}>
              <Feather name="sliders" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No rules yet</Text>
              <Text style={s.emptySub}>Create rules to auto-categorize repeated merchants.</Text>
            </View>
          )
        }
        ListFooterComponent={
          suggestions.length > 0 ? (
            <View style={s.suggestSection}>
              <Text style={s.suggestTitle}>Suggestions</Text>
              {suggestions.slice(0, 5).map((sug) => (
                <View key={sug.merchantName ?? sug.count} style={s.suggestCard}>
                  <Text style={s.suggestMerchant} numberOfLines={1}>
                    {sug.merchantName ?? "Unknown"}{" "}
                    <Text style={s.suggestCount}>({sug.count}×)</Text>
                  </Text>
                  <SuggestionCatPicker
                    categories={categories}
                    colors={colors}
                    onApprove={(catId) => approveSuggestion(sug, catId)}
                  />
                </View>
              ))}
            </View>
          ) : null
        }
      />

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <View style={s.modal}>
          <View style={s.modalTop}>
            <Text style={s.modalTitle}>New rule</Text>
            <Pressable onPress={() => setShowAdd(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Text style={s.label}>Merchant contains (optional)</Text>
          <TextInput
            style={s.input}
            value={merchant}
            onChangeText={setMerchant}
            placeholder="e.g. NETFLIX"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
          />
          <Text style={s.label}>Description contains (optional)</Text>
          <TextInput
            style={s.input}
            value={desc}
            onChangeText={setDesc}
            placeholder="e.g. subscription"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
          />
          <Text style={s.label}>Category *</Text>
          <Pressable style={s.picker} onPress={() => setShowCatPicker(true)}>
            {selectedCat ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={[s.dot, { backgroundColor: selectedCat.color }]} />
                <Text style={s.pickerText}>{selectedCat.name}</Text>
              </View>
            ) : (
              <Text style={s.pickerPlaceholder}>Select a category…</Text>
            )}
            <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
          </Pressable>
          <Pressable
            style={[s.saveBtn, (!categoryId || create.isPending) && s.saveBtnDisabled]}
            onPress={() => create.mutate({ categoryId, merchantContains: merchant || undefined, descriptionContains: desc || undefined })}
            disabled={!categoryId || create.isPending}
          >
            {create.isPending
              ? <ActivityIndicator color="#ffffff" />
              : <Text style={s.saveBtnText}>Save rule</Text>}
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
                onPress={() => { setCategoryId(cat.id); setShowCatPicker(false); }}
              >
                <View style={[s.dot, { backgroundColor: cat.color }]} />
                <Text style={[s.catOptionText, categoryId === cat.id && s.catOptionActive]}>{cat.name}</Text>
                {categoryId === cat.id && <Feather name="check" size={16} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        </Modal>
      </Modal>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SuggestionCatPicker({ categories, colors, onApprove }: any) {
  const [catId, setCatId] = useState(categories[0]?.id ?? "");
  const s = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
    select: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, backgroundColor: colors.card },
    selectText: { fontSize: 12, color: colors.foreground, fontFamily: "Inter_400Regular" },
    approveBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
    approveText: { color: "#ffffff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  });
  return (
    <View style={s.row}>
      <Pressable style={s.select} onPress={() => {
        const idx = categories.findIndex((c: Category) => c.id === catId);
        const next = categories[(idx + 1) % categories.length];
        setCatId(next?.id ?? catId);
      }}>
        <Text style={s.selectText} numberOfLines={1}>
          {categories.find((c: Category) => c.id === catId)?.name ?? "Category"}
        </Text>
      </Pressable>
      <Pressable style={s.approveBtn} onPress={() => onApprove(catId)}>
        <Text style={s.approveText}>Approve</Text>
      </Pressable>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styles = (colors: any, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    list: { paddingBottom: insets.bottom + 40 },
    listEmpty: { flex: 1 },
    listHeader: { padding: 16, paddingTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    listHeaderWeb: { paddingTop: 80 },
    headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground },
    headerSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    headerBtns: { flexDirection: "row", gap: 8 },
    rerunBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
    addBtn: { backgroundColor: colors.primary, borderRadius: 10, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    ruleCard: { marginHorizontal: 16, marginBottom: 10, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
    ruleHeader: { flexDirection: "row", alignItems: "flex-start" },
    ruleCat: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 2 },
    ruleMatch: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    deleteBtn: { padding: 4 },
    center: { paddingTop: 40, alignItems: "center" },
    emptyBox: { alignItems: "center", gap: 10, paddingVertical: 40 },
    emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 30 },
    suggestSection: { margin: 16, backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
    suggestTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 12 },
    suggestCard: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 },
    suggestMerchant: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    suggestCount: { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    modal: { flex: 1, backgroundColor: colors.background, padding: 20 },
    modalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 6, marginTop: 14 },
    input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: colors.foreground, backgroundColor: colors.card, fontFamily: "Inter_400Regular" },
    picker: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: colors.card },
    pickerText: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular" },
    pickerPlaceholder: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    dot: { width: 10, height: 10, borderRadius: 5 },
    saveBtn: { marginTop: 24, backgroundColor: colors.primary, borderRadius: 12, height: 50, alignItems: "center", justifyContent: "center" },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: "#ffffff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
    catOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    catOptionText: { flex: 1, fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular" },
    catOptionActive: { fontFamily: "Inter_600SemiBold", color: colors.primary },
  });
