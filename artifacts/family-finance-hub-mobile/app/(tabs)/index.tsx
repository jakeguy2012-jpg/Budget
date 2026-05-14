import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";

interface DashboardSummary {
  spending: number;
  income: number;
  netCashFlow: number;
  uncategorizedCount: number;
  byCategory: Array<{ name: string; value: number; color: string }>;
  byAccount: Array<{ name: string; value: number }>;
  budgets: Array<{
    id: string; categoryId: string; categoryName: string;
    categoryColor: string; month: string; planned: string;
  }>;
}

const money = (v: number) =>
  Math.abs(v).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiGet("/dashboard/summary"),
    refetchInterval: 60_000,
    enabled: !!user,
  });

  const s = styles(colors, insets);
  const now = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  const hasData = data && (
    data.byAccount.length > 0 || data.byCategory.length > 0 ||
    data.spending > 0 || data.income > 0
  );

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={s.header}>
        <View>
          <Text style={s.period}>{now}</Text>
          <Text style={s.title}>Household snapshot</Text>
        </View>
        {data && data.uncategorizedCount > 0 && (
          <Pressable
            style={s.alertBadge}
            onPress={() => router.push("/(tabs)/transactions")}
          >
            <Feather name="alert-circle" size={14} color="#92400e" />
            <Text style={s.alertText}>{data.uncategorizedCount} to review</Text>
          </Pressable>
        )}
      </View>

      {isLoading && (
        <View style={s.loadingBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.loadingText}>Loading your finances…</Text>
        </View>
      )}

      {isError && (
        <View style={s.errorBox}>
          <Feather name="wifi-off" size={20} color={colors.destructive} />
          <Text style={s.errorText}>Could not load data.</Text>
          <Pressable onPress={() => refetch()} style={s.retryBtn}>
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && data && !hasData && (
        <View style={s.emptyBox}>
          <Feather name="inbox" size={40} color={colors.mutedForeground} />
          <Text style={s.emptyTitle}>No data yet</Text>
          <Text style={s.emptySub}>
            Connect a bank or import a CSV to start tracking household spending.
          </Text>
        </View>
      )}

      {!isLoading && !isError && data && hasData && (
        <>
          <View style={s.statsGrid}>
            <StatCard
              label="Spending"
              value={money(data.spending)}
              accent={colors.destructive}
              icon="trending-down"
              colors={colors}
            />
            <StatCard
              label="Income"
              value={money(data.income)}
              accent={colors.success}
              icon="trending-up"
              colors={colors}
            />
            <StatCard
              label="Net Cash Flow"
              value={(data.netCashFlow >= 0 ? "+" : "") + money(data.netCashFlow)}
              accent={data.netCashFlow >= 0 ? colors.success : colors.destructive}
              icon="activity"
              colors={colors}
            />
            <StatCard
              label="Needs Review"
              value={String(data.uncategorizedCount)}
              accent={data.uncategorizedCount > 0 ? colors.warning : colors.mutedForeground}
              icon="tag"
              colors={colors}
            />
          </View>

          {data.byCategory.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Spending by category</Text>
              {data.byCategory.slice(0, 6).map((cat) => (
                <CategoryRow key={cat.name} name={cat.name} value={cat.value} color={cat.color}
                  total={data.spending} colors={colors} />
              ))}
            </View>
          )}

          {data.budgets.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Budget progress</Text>
                <Pressable onPress={() => router.push("/(tabs)/budgets")}>
                  <Text style={s.sectionLink}>Edit →</Text>
                </Pressable>
              </View>
              {data.budgets.map((budget) => {
                const actual = data.byCategory.find((c) => c.name === budget.categoryName)?.value ?? 0;
                const planned = Number(budget.planned);
                const pct = planned ? Math.min((actual / planned) * 100, 100) : 0;
                const over = actual > planned;
                return (
                  <BudgetRow
                    key={budget.id}
                    name={budget.categoryName}
                    color={budget.categoryColor}
                    actual={actual}
                    planned={planned}
                    pct={pct}
                    over={over}
                    colors={colors}
                  />
                );
              })}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatCard({ label, value, accent, icon, colors }: any) {
  const s = StyleSheet.create({
    card: {
      flex: 1,
      minWidth: "47%",
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 6 },
    label: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
    value: { fontSize: 22, fontFamily: "Inter_700Bold", color: accent, marginTop: 2 },
  });
  return (
    <View style={s.card}>
      <View style={s.iconRow}>
        <Feather name={icon} size={13} color={colors.mutedForeground} />
        <Text style={s.label}>{label}</Text>
      </View>
      <Text style={s.value} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CategoryRow({ name, value, color, total, colors }: any) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const s = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color, flexShrink: 0 },
    name: { flex: 1, fontSize: 13, color: colors.foreground, fontFamily: "Inter_400Regular" },
    bar: { height: 5, borderRadius: 3, backgroundColor: colors.muted, width: 80, overflow: "hidden" },
    fill: { height: 5, borderRadius: 3, backgroundColor: color },
    amount: { fontSize: 13, color: colors.foreground, fontFamily: "Inter_600SemiBold", minWidth: 60, textAlign: "right" },
  });
  return (
    <View style={s.row}>
      <View style={s.dot} />
      <Text style={s.name} numberOfLines={1}>{name}</Text>
      <View style={s.bar}>
        <View style={[s.fill, { width: `${pct}%` as unknown as number }]} />
      </View>
      <Text style={s.amount}>${(value / 1000).toFixed(1)}k</Text>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BudgetRow({ name, color, actual, planned, pct, over, colors }: any) {
  const s = StyleSheet.create({
    wrap: { marginBottom: 14 },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color },
    name: { fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" },
    amounts: { fontSize: 12, color: over ? colors.destructive : colors.mutedForeground, fontFamily: "Inter_400Regular" },
    bar: { height: 6, borderRadius: 3, backgroundColor: colors.muted, overflow: "hidden" },
    fill: { height: 6, borderRadius: 3, backgroundColor: over ? colors.destructive : colors.success },
  });
  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <View style={s.nameRow}>
          <View style={s.dot} />
          <Text style={s.name}>{name}</Text>
        </View>
        <Text style={s.amounts}>{money(actual)} / {money(planned)}</Text>
      </View>
      <View style={s.bar}>
        <View style={[s.fill, { width: `${pct}%` as unknown as number }]} />
      </View>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styles = (colors: any, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingTop: Platform.OS === "web" ? 80 : 16,
      paddingHorizontal: 16,
      paddingBottom: insets.bottom + 100,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
    },
    period: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 2 },
    title: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.foreground },
    alertBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#fef3c7",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: "#fcd34d",
    },
    alertText: { fontSize: 12, color: "#92400e", fontFamily: "Inter_500Medium" },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
    section: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 14 },
    sectionLink: { fontSize: 13, color: colors.primary, fontFamily: "Inter_500Medium" },
    loadingBox: { alignItems: "center", gap: 12, paddingVertical: 60 },
    loadingText: { color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14 },
    errorBox: { alignItems: "center", gap: 8, paddingVertical: 40 },
    errorText: { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    retryBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
    retryText: { color: "#ffffff", fontFamily: "Inter_600SemiBold", fontSize: 13 },
    emptyBox: { alignItems: "center", gap: 10, paddingVertical: 60 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", fontFamily: "Inter_400Regular", paddingHorizontal: 20 },
  });
