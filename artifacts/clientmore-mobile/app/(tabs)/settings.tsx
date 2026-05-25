import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { fetchSettings, saveSettings, type SettingsOut } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type FieldConfig = {
  key: keyof SettingsOut;
  label: string;
  placeholder?: string;
  secure?: boolean;
  type?: "text" | "toggle" | "number";
};

const COMPANY_FIELDS: FieldConfig[] = [
  { key: "companyName", label: "Company Name", placeholder: "Acme Corp" },
  { key: "botName", label: "Bot Name", placeholder: "Support Bot" },
  { key: "botTone", label: "Bot Tone", placeholder: "friendly, professional…" },
];

const INTEGRATION_FIELDS: FieldConfig[] = [
  { key: "telegramToken", label: "Telegram Token", placeholder: "bot1234:ABCD…", secure: true },
  { key: "isTelegramActive", label: "Telegram Active", type: "toggle" },
  { key: "twilioSid", label: "Twilio SID", placeholder: "ACxxxxx…", secure: true },
  { key: "isWhatsappActive", label: "WhatsApp Active", type: "toggle" },
];

const ADVANCED_FIELDS: FieldConfig[] = [
  { key: "confidenceThreshold", label: "Confidence Threshold", placeholder: "0.75", type: "number" },
  { key: "purchaseFlowEnabled", label: "Purchase Flow", type: "toggle" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { clearAuth } = useAuth();
  const qc = useQueryClient();

  const [draft, setDraft] = useState<Partial<SettingsOut>>({});
  const [dirty, setDirty] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  useEffect(() => {
    if (data) setDraft({ ...data });
  }, [data]);

  const saveMut = useMutation({
    mutationFn: (d: Partial<SettingsOut>) => saveSettings(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setDirty(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Settings updated successfully.");
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Save failed", e?.message ?? "Please try again.");
    },
  });

  function setField<K extends keyof SettingsOut>(key: K, value: SettingsOut[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function handleSave() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveMut.mutate(draft);
  }

  function handleLogout() {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await clearAuth();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  const s = makeStyles(colors, insets);

  function renderField(f: FieldConfig) {
    const val = draft[f.key];

    if (f.type === "toggle") {
      return (
        <View key={f.key} style={s.fieldRow}>
          <Text style={s.fieldLabel}>{f.label}</Text>
          <Switch
            value={!!val}
            onValueChange={(v) => setField(f.key, v as any)}
            trackColor={{ false: colors.secondary, true: `${colors.primary}80` }}
            thumbColor={val ? colors.primary : colors.mutedForeground}
          />
        </View>
      );
    }

    return (
      <View key={f.key} style={s.field}>
        <Text style={s.label}>{f.label.toUpperCase()}</Text>
        <TextInput
          style={s.input}
          value={val != null ? String(val) : ""}
          onChangeText={(t) =>
            setField(f.key, (f.type === "number" ? parseFloat(t) || 0 : t) as any)
          }
          placeholder={f.placeholder}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={f.secure}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={f.type === "number" ? "decimal-pad" : "default"}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.topBar}>
        <Text style={s.title}>Settings</Text>
        {dirty && (
          <Pressable
            style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.85 }]}
            onPress={handleSave}
            disabled={saveMut.isPending}
          >
            {saveMut.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.saveBtnText}>Save</Text>
            )}
          </Pressable>
        )}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isLoading ? (
          <View style={s.center}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={s.loaderText}>Loading settings…</Text>
          </View>
        ) : isError ? (
          <View style={s.center}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.destructive} />
            <Text style={s.errorTitle}>Couldn't load settings</Text>
            <Pressable style={s.retryBtn} onPress={() => refetch()}>
              <Text style={s.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Subscription pill */}
            {data?.subscriptionPlan && (
              <View style={s.planRow}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
                <Text style={s.planText}>{data.subscriptionPlan}</Text>
                <Text style={s.planMsgs}>{data.usedMessages?.toLocaleString()} messages used</Text>
              </View>
            )}

            <View style={s.section}>
              <Text style={s.sectionTitle}>Company</Text>
              {COMPANY_FIELDS.map(renderField)}
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Integrations</Text>
              {INTEGRATION_FIELDS.map(renderField)}
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Advanced</Text>
              {ADVANCED_FIELDS.map(renderField)}
            </View>

            <Pressable style={s.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
              <Text style={s.logoutText}>Sign out</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) {
  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    topBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      paddingTop: topPad,
      paddingHorizontal: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    title: { fontSize: 22, fontFamily: "Inter_700Bold", color: c.foreground },
    saveBtn: { backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10 },
    saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: insets.bottom + 120, gap: 16 },
    center: { alignItems: "center", marginTop: 60, gap: 10 },
    loaderText: { fontSize: 14, fontFamily: "Inter_400Regular", color: c.mutedForeground },
    errorTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.foreground },
    retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.primary, borderRadius: 10 },
    retryText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#fff" },
    planRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: `${c.primary}18`,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    planText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.primary },
    planMsgs: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginLeft: "auto" as any },
    section: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      gap: 0,
    },
    sectionTitle: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: c.mutedForeground,
      letterSpacing: 0.8,
      padding: 14,
      paddingBottom: 8,
    },
    field: { paddingHorizontal: 14, paddingBottom: 12 },
    fieldRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    fieldLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: c.foreground },
    label: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
      color: c.mutedForeground,
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    input: {
      backgroundColor: c.secondary,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: c.foreground,
    },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: `${c.destructive}40`,
      marginTop: 4,
    },
    logoutText: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.destructive },
  });
}
