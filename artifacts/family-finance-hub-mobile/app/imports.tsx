import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { apiPost } from "@/lib/api";

const EXAMPLE_CSV = `date,description,amount,merchant,account\n2024-01-05,GROCERY STORE,-82.14,Whole Foods,Chase Checking\n2024-01-06,PAYROLL,3000.00,,Chase Checking\n2024-01-07,NETFLIX SUBSCRIPTION,-15.49,Netflix,Chase Checking`;

export default function ImportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [csv, setCsv] = useState("");
  const [dateColumn, setDateColumn] = useState("date");
  const [descriptionColumn, setDescriptionColumn] = useState("description");
  const [amountColumn, setAmountColumn] = useState("amount");
  const [merchantColumn, setMerchantColumn] = useState("merchant");
  const [accountColumn, setAccountColumn] = useState("account");
  const [lastResult, setLastResult] = useState<{ imported: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importCsv = useMutation({
    mutationFn: (data: object) => apiPost<{ imported: number }>("/imports", data),
    onSuccess: async (res) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLastResult(res);
      setError(null);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setCsv("");
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleImport = () => {
    if (!csv.trim()) return;
    setError(null);
    importCsv.mutate({
      csv,
      dateColumn,
      descriptionColumn,
      amountColumn,
      merchantColumn: merchantColumn || undefined,
      accountColumn: accountColumn || undefined,
    });
  };

  const s = styles(colors, insets);

  return (
    <View style={s.root}>
      <Stack.Screen options={{ title: "Import CSV" }} />
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageTitle}>Import CSV</Text>
        <Text style={s.pageSub}>
          Paste bank-exported CSV. Duplicate rows are skipped automatically.
        </Text>

        <View style={s.infoBox}>
          <Feather name="info" size={14} color={colors.primary} style={{ marginBottom: 4 }} />
          <Text style={s.infoText}>
            {`• Paste raw CSV with a header row\n• Amounts: positive = income, negative = expense\n• Re-importing the same file is safe — no duplicates`}
          </Text>
        </View>

        {lastResult && (
          <View style={s.successBox}>
            <Feather name="check-circle" size={16} color={colors.success} />
            <Text style={s.successText}>
              {lastResult.imported} transaction{lastResult.imported !== 1 ? "s" : ""} imported. Duplicates skipped.
            </Text>
          </View>
        )}

        {error && (
          <View style={s.errorBox}>
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <View style={s.csvHeader}>
          <Text style={s.label}>CSV data *</Text>
          <Pressable onPress={() => setCsv(EXAMPLE_CSV)}>
            <Text style={s.exampleLink}>Load example</Text>
          </Pressable>
        </View>
        <TextInput
          style={s.csvInput}
          value={csv}
          onChangeText={setCsv}
          placeholder="Paste CSV here (including header row)…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={6}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />

        <Text style={[s.label, { marginTop: 20 }]}>Column mapping</Text>
        <Text style={s.mappingHint}>Enter exact column header names from your CSV (case-insensitive).</Text>

        {([
          { label: "Date column *", value: dateColumn, set: setDateColumn, placeholder: "date" },
          { label: "Description column *", value: descriptionColumn, set: setDescriptionColumn, placeholder: "description" },
          { label: "Amount column *", value: amountColumn, set: setAmountColumn, placeholder: "amount" },
          { label: "Merchant column (optional)", value: merchantColumn, set: setMerchantColumn, placeholder: "merchant" },
          { label: "Account column (optional)", value: accountColumn, set: setAccountColumn, placeholder: "account" },
        ] as const).map(({ label, value, set, placeholder }) => (
          <View key={label} style={s.fieldGroup}>
            <Text style={s.fieldLabel}>{label}</Text>
            <TextInput
              style={s.fieldInput}
              value={value}
              // @ts-ignore
              onChangeText={set}
              placeholder={placeholder}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ))}

        <Pressable
          style={[s.importBtn, (!csv.trim() || importCsv.isPending) && s.importBtnDisabled]}
          onPress={handleImport}
          disabled={!csv.trim() || importCsv.isPending}
        >
          {importCsv.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Feather name="upload" size={16} color="#ffffff" />
              <Text style={s.importBtnText}>Import CSV</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styles = (colors: any, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: {
      padding: 16,
      paddingTop: Platform.OS === "web" ? 80 : 16,
      paddingBottom: insets.bottom + 40,
    },
    pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 4 },
    pageSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 16 },
    infoBox: { backgroundColor: colors.muted, borderRadius: 10, padding: 12, marginBottom: 16 },
    infoText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    successBox: {
      flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f0fdf4",
      borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#bbf7d0",
    },
    successText: { color: colors.success, fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
    errorBox: {
      flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fef2f2",
      borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#fecaca",
    },
    errorText: { color: colors.destructive, fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
    csvHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    exampleLink: { fontSize: 13, color: colors.primary, fontFamily: "Inter_500Medium" },
    csvInput: {
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 12,
      fontSize: 12, color: colors.foreground, backgroundColor: colors.card,
      fontFamily: "Inter_400Regular", minHeight: 130, textAlignVertical: "top",
    },
    mappingHint: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 12, marginTop: 4 },
    fieldGroup: { marginBottom: 10 },
    fieldLabel: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginBottom: 4 },
    fieldInput: {
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, padding: 10,
      fontSize: 14, color: colors.foreground, backgroundColor: colors.card, fontFamily: "Inter_400Regular",
    },
    importBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: colors.primary, borderRadius: 12, height: 52, marginTop: 20,
    },
    importBtnDisabled: { opacity: 0.5 },
    importBtnText: { color: "#ffffff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  });
