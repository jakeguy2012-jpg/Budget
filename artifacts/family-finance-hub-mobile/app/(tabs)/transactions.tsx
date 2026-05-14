import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  RefreshControl,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPatch } from "@/lib/api";

interface Transaction {
  id: string; date: string; description: string;
  merchantName: string | null; amount: string; direction: string;
  userReviewed: boolean; notes: string | null; categoryId: string | null;
  categoryName: string | null; categoryColor: string | null;
  accountId: string; accountName: string;
}
interface Category { id: string; name: string; color: string; }

const money = (v: number) =>
  Math.abs(v).toLocaleString("en-US", { style: "currency", currency: "USD" });
const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = iso(new Date());
const ago90 = iso(new Date(Date.now() - 90 * 86_400_000));

export default function TransactionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [q, setQ] = useState("");
  const [dateFrom] = useState(ago90);
  const [dateTo] = useState(today);
  const [pickerTx, setPickerTx] = useState<Transaction | null>(null);

  const qs = new URLSearchParams({ dateFrom, dateTo, limit: "200" }).toString();

  const { data: txs = [], isLoading, isFetching, refetch } = useQuery<Transaction[]>({
    queryKey: ["transactions", dateFrom, dateTo],
    queryFn: () => apiGet(`/transactions?${qs}`),
    enabled: !!user,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiGet("/categories"),
    enabled: !!user,
  });

  const updateTx = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiPatch<Transaction>(`/transactions/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  const filtered = useMemo(() => {
    if (!q.trim()) return txs;
    const lower = q.toLowerCase();
    return txs.filter(
      (t) =>
        (t.merchantName ?? t.description).toLowerCase().includes(lower) ||
        (t.categoryName ?? "").toLowerCase().includes(lower)
    );
  }, [txs, q]);

  const markReviewed = async (tx: Transaction) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateTx.mutate({ id: tx.id, userReviewed: !tx.userReviewed });
  };

  const assignCategory = async (categoryId: string | null) => {
    if (!pickerTx) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateTx.mutate({ id: pickerTx.id, categoryId });
    setPickerTx(null);
  };

  const s = styles(colors, insets);

  const renderItem = ({ item: tx }: { item: Transaction }) => {
    const amt = Number(tx.amount);
    const isExpense = tx.direction === "expense";
    const isIncome = tx.direction === "income";
    const amountColor = isExpense ? colors.destructive : isIncome ? colors.success : colors.mutedForeground;
    const prefix = isExpense ? "−" : isIncome ? "+" : "";

    return (
      <Pressable
        style={[s.txRow, !tx.userReviewed && s.txRowUnreviewed]}
        onPress={() => setPickerTx(tx)}
      >
        <View style={s.txLeft}>
          {tx.categoryColor ? (
            <View style={[s.catDot, { backgroundColor: tx.categoryColor }]} />
          ) : (
            <View style={[s.catDot, s.catDotEmpty]} />
          )}
          <View style={s.txMeta}>
            <Text style={s.txName} numberOfLines={1}>
              {tx.merchantName ?? tx.description}
            </Text>
            <Text style={s.txSub} numberOfLines={1}>
              {tx.categoryName ?? "Uncategorized"} · {tx.date.slice(0, 10)}
            </Text>
          </View>
        </View>
        <View style={s.txRight}>
          <Text style={[s.txAmount, { color: amountColor }]}>
            {prefix}{money(amt)}
          </Text>
          <Pressable onPress={() => markReviewed(tx)} style={s.checkBtn}>
            <Feather
              name="check-circle"
              size={18}
              color={tx.userReviewed ? colors.success : colors.border}
            />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={s.root}>
      <View style={[s.searchBar, Platform.OS === "web" && s.searchBarWeb]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={s.searchInput}
          value={q}
          onChangeText={setQ}
          placeholder="Search transactions…"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {q.length > 0 && Platform.OS !== "ios" && (
          <Pressable onPress={() => setQ("")}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {isLoading && (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        renderItem={renderItem}
        contentContainerStyle={[s.list, filtered.length === 0 && s.listEmpty]}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
        scrollEnabled={filtered.length > 0}
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.emptyBox}>
              <Feather name="inbox" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No transactions</Text>
              <Text style={s.emptySub}>Try a different search term.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          filtered.length > 0 ? (
            <Text style={s.footer}>{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}</Text>
          ) : null
        }
      />

      <Modal visible={!!pickerTx} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickerTx(null)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle} numberOfLines={1}>
              {pickerTx?.merchantName ?? pickerTx?.description}
            </Text>
            <Pressable onPress={() => setPickerTx(null)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Text style={s.modalSub}>Assign category</Text>
          <Pressable style={s.catOption} onPress={() => assignCategory(null)}>
            <View style={[s.catDot, s.catDotEmpty]} />
            <Text style={[s.catOptionText, !pickerTx?.categoryId && s.catOptionActive]}>
              Uncategorized
            </Text>
            {!pickerTx?.categoryId && <Feather name="check" size={16} color={colors.primary} />}
          </Pressable>
          {categories.map((cat) => (
            <Pressable key={cat.id} style={s.catOption} onPress={() => assignCategory(cat.id)}>
              <View style={[s.catDot, { backgroundColor: cat.color }]} />
              <Text style={[s.catOptionText, pickerTx?.categoryId === cat.id && s.catOptionActive]}>
                {cat.name}
              </Text>
              {pickerTx?.categoryId === cat.id && <Feather name="check" size={16} color={colors.primary} />}
            </Pressable>
          ))}
        </View>
      </Modal>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styles = (colors: any, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    searchBarWeb: { paddingTop: 80 },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    list: { paddingBottom: insets.bottom + 100 },
    listEmpty: { flex: 1 },
    txRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    txRowUnreviewed: { backgroundColor: colors.muted },
    txLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0 },
    catDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
    catDotEmpty: { backgroundColor: colors.border },
    txMeta: { flex: 1, minWidth: 0 },
    txName: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_500Medium" },
    txSub: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    txRight: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 0 },
    txAmount: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    checkBtn: { padding: 2 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyBox: { alignItems: "center", gap: 8, paddingVertical: 60 },
    emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    footer: { textAlign: "center", color: colors.mutedForeground, fontSize: 12, padding: 16, fontFamily: "Inter_400Regular" },
    modal: { flex: 1, backgroundColor: colors.background, padding: 20 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    modalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground, flex: 1, marginRight: 12 },
    modalSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 20 },
    catOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    catOptionText: { flex: 1, fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular" },
    catOptionActive: { fontFamily: "Inter_600SemiBold", color: colors.primary },
  });
