import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";

interface Account {
  id: string; name: string; type: string; subtype: string | null;
  mask: string | null; currentBalance: string; currency: string;
  isActive: boolean; provider: string; connectionName: string;
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: () => apiGet("/accounts"),
    enabled: !!user,
  });

  const handleLogout = () => {
    if (Platform.OS === "web") {
      logout().then(() => router.replace("/login"));
      return;
    }
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await logout();
            router.replace("/login");
          },
        },
      ]
    );
  };

  const s = styles(colors, insets);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {user && (
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{user.name}</Text>
            <Text style={s.profileSub}>{user.householdName}</Text>
            <View style={s.roleBadge}>
              <Text style={s.roleText}>{user.role === "admin" ? "Admin" : "Viewer/Editor"}</Text>
            </View>
          </View>
        </View>
      )}

      <Text style={s.sectionLabel}>Accounts</Text>
      <View style={s.section}>
        {isLoading && (
          <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
        )}
        {!isLoading && accounts.length === 0 && (
          <View style={s.emptyInSection}>
            <Feather name="credit-card" size={24} color={colors.mutedForeground} />
            <Text style={s.emptyInSectionText}>No accounts connected.</Text>
          </View>
        )}
        {accounts.map((acct, i) => (
          <View key={acct.id} style={[s.accountRow, i > 0 && s.accountRowBorder]}>
            <View style={s.accountIcon}>
              <Feather name="credit-card" size={16} color={colors.primary} />
            </View>
            <View style={s.accountMeta}>
              <Text style={s.accountName}>{acct.name}{acct.mask ? ` ···${acct.mask}` : ""}</Text>
              <Text style={s.accountSub}>{acct.connectionName} · {acct.type}</Text>
            </View>
            <Text style={s.accountBalance}>
              ${Number(acct.currentBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </Text>
          </View>
        ))}
      </View>

      <Text style={s.sectionLabel}>Manage</Text>
      <View style={s.section}>
        <NavRow label="Bank Connections" icon="link-2" colors={colors} onPress={() => router.push("/connections")} />
        <NavRow label="Auto-categorization Rules" icon="sliders" colors={colors} onPress={() => router.push("/rules")} />
        <NavRow label="Import CSV" icon="upload" colors={colors} onPress={() => router.push("/imports")} last />
      </View>

      <Text style={s.sectionLabel}>About</Text>
      <View style={s.section}>
        <InfoRow label="App" value="Family Finance Hub" icon="home" colors={colors} />
        <InfoRow label="Version" value="1.0.0" icon="info" colors={colors} last />
      </View>

      <Pressable
        style={({ pressed }) => [s.logoutBtn, pressed && s.logoutBtnPressed]}
        onPress={handleLogout}
        testID="logout-button"
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={s.logoutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NavRow({ label, icon, colors, onPress, last }: any) {
  const s = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border },
    iconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
    label: { flex: 1, fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular" },
  });
  return (
    <Pressable style={({ pressed }) => [s.row, { opacity: pressed ? 0.7 : 1 }]} onPress={onPress}>
      <View style={s.iconWrap}><Feather name={icon} size={15} color={colors.mutedForeground} /></View>
      <Text style={s.label}>{label}</Text>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InfoRow({ label, value, icon, colors, last }: any) {
  const s = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border },
    iconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
    label: { flex: 1, fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular" },
    value: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
  });
  return (
    <View style={s.row}>
      <View style={s.iconWrap}><Feather name={icon} size={15} color={colors.mutedForeground} /></View>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styles = (colors: any, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "web" ? 80 : 16,
      paddingBottom: insets.bottom + 100,
    },
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 22, color: "#ffffff", fontFamily: "Inter_700Bold" },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    profileSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 6 },
    roleBadge: { alignSelf: "flex-start", backgroundColor: colors.muted, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    roleText: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    sectionLabel: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
    section: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, marginBottom: 20 },
    accountRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
    accountRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    accountIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
    accountMeta: { flex: 1 },
    accountName: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
    accountSub: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    accountBalance: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    center: { paddingVertical: 20, alignItems: "center" },
    emptyInSection: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16 },
    emptyInSectionText: { color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14 },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    logoutBtnPressed: { opacity: 0.7 },
    logoutText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.destructive },
  });
