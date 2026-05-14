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
  RefreshControl,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

interface SyncRun {
  id: string; startedAt: string; status: string;
  transactionsInserted: number; errorMessage: string | null;
}
interface Connection {
  id: string; name: string; provider: string;
  isActive: boolean; lastSyncedAt: string | null; syncRuns: SyncRun[];
}

type Mode = "list" | "demo" | "simplefin";

export default function ConnectionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("list");
  const [name, setName] = useState("My Bank");
  const [credential, setCredential] = useState("");
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { data: connections = [], isLoading, isFetching, refetch } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => apiGet("/connections"),
    refetchInterval: 15_000,
    enabled: !!user,
  });

  const createDemo = useMutation({
    mutationFn: () => apiPost("/connections", { provider: "demo", name: "Demo Bank" }),
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["connections"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setMode("list");
    },
  });

  const createSimplefin = useMutation({
    mutationFn: () => apiPost("/connections", { provider: "simplefin", name, credential }),
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["connections"] });
      setMode("list");
      setCredential("");
    },
  });

  const sync = useMutation({
    mutationFn: (id: string) => {
      setSyncingId(id);
      return apiPost<{ message: string }>(`/connections/${id}/sync`, {});
    },
    onSuccess: () => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["connections"] });
        qc.invalidateQueries({ queryKey: ["transactions"] });
        qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
        setSyncingId(null);
      }, 5000);
    },
    onError: () => setSyncingId(null),
  });

  const deleteConn = useMutation({
    mutationFn: (id: string) => apiDelete(`/connections/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  const confirmDelete = (id: string, connName: string) => {
    if (Platform.OS === "web") {
      deleteConn.mutate(id);
      return;
    }
    Alert.alert("Delete connection?", `This will remove "${connName}" and all its data.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteConn.mutate(id) },
    ]);
  };

  const s = styles(colors, insets);

  if (mode === "demo") {
    return (
      <View style={s.root}>
        <Stack.Screen options={{ title: "Add Demo Connection" }} />
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.infoBox}>
            <Feather name="flask" size={16} color="#92400e" style={{ marginBottom: 6 }} />
            <Text style={s.infoTitle}>Demo bank connection</Text>
            <Text style={s.infoText}>
              Generates realistic fake accounts and transactions instantly. No SimpleFIN subscription required. Re-syncing will not create duplicates.
            </Text>
          </View>
          <Pressable
            style={[s.btn, createDemo.isPending && s.btnDisabled]}
            onPress={() => createDemo.mutate()}
            disabled={createDemo.isPending}
          >
            {createDemo.isPending
              ? <ActivityIndicator color="#ffffff" />
              : <Text style={s.btnText}>Add demo connection</Text>}
          </Pressable>
          <Pressable style={s.cancelBtn} onPress={() => setMode("list")}>
            <Text style={s.cancelText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (mode === "simplefin") {
    return (
      <View style={s.root}>
        <Stack.Screen options={{ title: "SimpleFIN Connection" }} />
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={[s.infoBox, s.warningBox]}>
            <Feather name="alert-triangle" size={16} color="#92400e" style={{ marginBottom: 6 }} />
            <Text style={s.infoTitle}>Before connecting a real account</Text>
            <Text style={s.infoText}>
              Test with demo mode first. SimpleFIN Bridge requires a paid subscription. Your bank credentials never reach this app — only a read-only access URL.
            </Text>
          </View>
          <Text style={s.label}>Connection name</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Chase checking"
            placeholderTextColor={colors.mutedForeground}
          />
          <Text style={s.label}>SimpleFIN access URL</Text>
          <TextInput
            style={[s.input, s.multiline]}
            value={credential}
            onChangeText={setCredential}
            placeholder="https://beta-bridge.simplefin.org/simplefin/…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={s.hint}>Encrypted with AES-256-GCM before storage. Never logged.</Text>
          <Pressable
            style={[s.btn, (!name || !credential || createSimplefin.isPending) && s.btnDisabled]}
            onPress={() => createSimplefin.mutate()}
            disabled={!name || !credential || createSimplefin.isPending}
          >
            {createSimplefin.isPending
              ? <ActivityIndicator color="#ffffff" />
              : <Text style={s.btnText}>Save read-only connection</Text>}
          </Pressable>
          <Pressable style={s.cancelBtn} onPress={() => { setMode("list"); setCredential(""); }}>
            <Text style={s.cancelText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ title: "Bank Connections" }} />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <Text style={s.pageTitle}>Bank connections</Text>
        <Text style={s.pageSub}>Read-only sync — no payments or transfers.</Text>

        <View style={s.addRow}>
          <Pressable style={s.addCard} onPress={() => setMode("demo")}>
            <Feather name="zap" size={18} color="#92400e" />
            <View style={{ flex: 1 }}>
              <Text style={s.addCardTitle}>Demo sync</Text>
              <Text style={s.addCardSub}>No subscription needed</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
          <Pressable style={[s.addCard, s.addCardBlue]} onPress={() => setMode("simplefin")}>
            <Feather name="shield" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[s.addCardTitle, { color: colors.primary }]}>SimpleFIN</Text>
              <Text style={s.addCardSub}>Real bank connection</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}

        {!isLoading && connections.length === 0 && (
          <View style={s.emptyBox}>
            <Feather name="link-2" size={32} color={colors.mutedForeground} />
            <Text style={s.emptyTitle}>No connections yet</Text>
            <Text style={s.emptySub}>Add a demo or SimpleFIN connection to start syncing.</Text>
          </View>
        )}

        {connections.map((c) => (
          <View key={c.id} style={s.connCard}>
            <View style={s.connHeader}>
              <View style={{ flex: 1 }}>
                <View style={s.connNameRow}>
                  {c.provider === "demo" && (
                    <View style={s.demoBadge}><Text style={s.demoBadgeText}>Demo</Text></View>
                  )}
                  <Text style={s.connName}>{c.name}</Text>
                </View>
                <Text style={s.connSub}>
                  <Text style={{ color: c.isActive ? colors.success : colors.destructive }}>
                    {c.isActive ? "active" : "inactive"}
                  </Text>
                  {" · Last sync: "}
                  {c.lastSyncedAt ? new Date(c.lastSyncedAt).toLocaleDateString() : "never"}
                </Text>
              </View>
              <View style={s.connActions}>
                <Pressable
                  style={[s.syncBtn, syncingId === c.id && s.btnDisabled]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); sync.mutate(c.id); }}
                  disabled={syncingId === c.id}
                >
                  <Feather name="refresh-cw" size={14} color="#ffffff" />
                </Pressable>
                <Pressable
                  style={s.deleteBtn}
                  onPress={() => confirmDelete(c.id, c.name)}
                >
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                </Pressable>
              </View>
            </View>
            {c.syncRuns.length > 0 && (
              <View style={s.syncHistory}>
                {c.syncRuns.slice(0, 3).map((r) => (
                  <View key={r.id} style={s.syncRow}>
                    <Feather
                      name={r.status === "completed" ? "check-circle" : r.status === "failed" ? "x-circle" : "refresh-cw"}
                      size={12}
                      color={r.status === "completed" ? colors.success : r.status === "failed" ? colors.destructive : colors.primary}
                    />
                    <Text style={s.syncDate}>{new Date(r.startedAt).toLocaleDateString()}</Text>
                    <Text style={s.syncStatus}>{r.status}</Text>
                    {r.status === "completed" && (
                      <Text style={s.syncCount}>+{r.transactionsInserted}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
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
    pageSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 20 },
    addRow: { gap: 10, marginBottom: 20 },
    addCard: {
      flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
      backgroundColor: "#fef3c7", borderRadius: 12, borderWidth: 1, borderColor: "#fcd34d",
    },
    addCardBlue: { backgroundColor: colors.muted, borderColor: colors.border },
    addCardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#92400e" },
    addCardSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    infoBox: {
      backgroundColor: "#fef3c7", borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: "#fcd34d", marginBottom: 16,
    },
    warningBox: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
    infoTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#92400e", marginBottom: 4 },
    infoText: { fontSize: 13, color: "#78350f", fontFamily: "Inter_400Regular", lineHeight: 19 },
    label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 6, marginTop: 12 },
    input: {
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 12,
      fontSize: 14, color: colors.foreground, backgroundColor: colors.card, fontFamily: "Inter_400Regular",
    },
    multiline: { minHeight: 80, textAlignVertical: "top" },
    hint: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 4, marginBottom: 8 },
    btn: {
      backgroundColor: colors.primary, borderRadius: 12, height: 50,
      alignItems: "center", justifyContent: "center", marginTop: 8,
    },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: "#ffffff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
    cancelBtn: { alignItems: "center", marginTop: 12, padding: 10 },
    cancelText: { color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
    emptyBox: { alignItems: "center", gap: 10, paddingVertical: 40 },
    emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    connCard: {
      backgroundColor: colors.card, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: colors.border, marginBottom: 12,
    },
    connHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    connNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
    demoBadge: { backgroundColor: "#fef3c7", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    demoBadgeText: { fontSize: 10, color: "#92400e", fontFamily: "Inter_600SemiBold" },
    connName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    connSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    connActions: { flexDirection: "row", gap: 8 },
    syncBtn: { backgroundColor: colors.primary, borderRadius: 8, width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    deleteBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    syncHistory: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 6 },
    syncRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    syncDate: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    syncStatus: { fontSize: 11, color: colors.foreground, fontFamily: "Inter_500Medium" },
    syncCount: { fontSize: 11, color: colors.success, fontFamily: "Inter_500Medium" },
  });
