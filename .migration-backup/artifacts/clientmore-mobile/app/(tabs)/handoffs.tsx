import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { fetchHandoffs, replyToHandoff, resolveHandoff, type HandoffOut } from "@/lib/api";

const STATUS_FILTERS = ["all", "pending", "resolved"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function channelIcon(channel: string): keyof typeof Ionicons.glyphMap {
  const c = channel.toLowerCase();
  if (c.includes("telegram")) return "paper-plane-outline";
  if (c.includes("whatsapp")) return "logo-whatsapp";
  if (c.includes("web")) return "globe-outline";
  return "chatbubble-outline";
}

export default function HandoffsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: handoffs = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["handoffs", filter],
    queryFn: () => fetchHandoffs(filter === "all" ? undefined : filter),
  });

  const resolveMut = useMutation({
    mutationFn: (id: number) => resolveHandoff(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handoffs"] });
      setExpanded(null);
    },
  });

  const replyMut = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) =>
      replyToHandoff(id, message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handoffs"] });
      setReplyText("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: any) => {
      Alert.alert("Reply failed", e?.message ?? "Please try again.");
    },
  });

  function handleResolve(id: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Resolve handoff", "Mark this as resolved?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Resolve",
        style: "destructive",
        onPress: () => resolveMut.mutate(id),
      },
    ]);
  }

  function handleReply(id: number) {
    if (!replyText.trim()) return;
    replyMut.mutate({ id, message: replyText.trim() });
  }

  const s = makeStyles(colors, insets);

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <View>
          <Text style={s.title}>Handoffs</Text>
          <Text style={s.subtitle}>{handoffs.length} conversation{handoffs.length !== 1 ? "s" : ""}</Text>
        </View>
        <Pressable onPress={() => refetch()} hitSlop={8} style={s.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[s.filterTab, filter === f && s.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={s.list}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading ? (
          <View style={s.center}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={s.loaderText}>Loading handoffs…</Text>
          </View>
        ) : isError ? (
          <View style={s.center}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.destructive} />
            <Text style={s.errorTitle}>Couldn't load handoffs</Text>
            <Pressable style={s.retryBtn} onPress={() => refetch()}>
              <Text style={s.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : handoffs.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="checkmark-done-circle-outline" size={36} color={colors.success} />
            </View>
            <Text style={s.emptyTitle}>All clear!</Text>
            <Text style={s.emptySub}>No handoffs in this queue.</Text>
          </View>
        ) : (
          handoffs.map((h) => {
            const isOpen = expanded === h.id;
            return (
              <View key={h.id} style={[s.card, h.unreplied && s.cardUrgent]}>
                <Pressable onPress={() => setExpanded(isOpen ? null : h.id)} style={s.cardHeader}>
                  <View style={[s.channelIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                    <Ionicons name={channelIcon(h.channel)} size={16} color={colors.primary} />
                  </View>
                  <View style={s.cardMeta}>
                    <View style={s.cardMetaRow}>
                      <Text style={s.cardUser} numberOfLines={1}>{h.user || "Anonymous"}</Text>
                      {h.unreplied && (
                        <View style={s.urgentBadge}>
                          <Text style={s.urgentText}>Unreplied</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.cardReason} numberOfLines={1}>{h.reason}</Text>
                    <Text style={s.cardTime}>{h.channel} · {h.language.toUpperCase()} · {h.timeAgo}</Text>
                  </View>
                  <Ionicons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.mutedForeground}
                  />
                </Pressable>

                {isOpen && (
                  <View style={s.cardBody}>
                    {h.messages.length > 0 && (
                      <View style={s.messages}>
                        {h.messages.slice(-5).map((msg) => (
                          <View
                            key={msg.id}
                            style={[
                              s.msgBubble,
                              msg.role === "agent" ? s.msgAgent : s.msgUser,
                            ]}
                          >
                            <Text style={[
                              s.msgText,
                              msg.role === "agent" ? { color: "#fff" } : { color: colors.foreground },
                            ]}>
                              {msg.content}
                            </Text>
                            <Text style={s.msgTime}>{msg.time}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={s.replyRow}>
                      <TextInput
                        style={s.replyInput}
                        value={replyText}
                        onChangeText={setReplyText}
                        placeholder="Type a reply…"
                        placeholderTextColor={colors.mutedForeground}
                        multiline
                        returnKeyType="send"
                      />
                      <Pressable
                        style={[s.sendBtn, (!replyText.trim() || replyMut.isPending) && s.sendBtnDisabled]}
                        onPress={() => handleReply(h.id)}
                        disabled={!replyText.trim() || replyMut.isPending}
                      >
                        {replyMut.isPending ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Ionicons name="send" size={16} color="#fff" />
                        )}
                      </Pressable>
                    </View>

                    <Pressable
                      style={s.resolveBtn}
                      onPress={() => handleResolve(h.id)}
                      disabled={resolveMut.isPending}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                      <Text style={s.resolveBtnText}>Mark as resolved</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
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
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    title: { fontSize: 22, fontFamily: "Inter_700Bold", color: c.foreground },
    subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 2 },
    refreshBtn: { padding: 8, backgroundColor: c.card, borderRadius: 10, borderWidth: 1, borderColor: c.border },
    filterRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    filterTab: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    filterTabActive: { backgroundColor: c.primary, borderColor: c.primary },
    filterText: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.mutedForeground },
    filterTextActive: { color: "#fff" },
    list: { flex: 1 },
    listContent: { padding: 16, paddingBottom: insets.bottom + 100 },
    center: { alignItems: "center", marginTop: 60, gap: 10 },
    loaderText: { fontSize: 14, fontFamily: "Inter_400Regular", color: c.mutedForeground },
    errorTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.foreground },
    retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.primary, borderRadius: 10 },
    retryText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#fff" },
    empty: { alignItems: "center", marginTop: 60 },
    emptyIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: `${c.success}18`, alignItems: "center", justifyContent: "center", marginBottom: 16 },
    emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.foreground },
    emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 6 },
    card: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 10,
      overflow: "hidden",
    },
    cardUrgent: { borderColor: `${c.warning}60` },
    cardHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
    channelIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    cardMeta: { flex: 1 },
    cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
    cardUser: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.foreground, flex: 1 },
    urgentBadge: { backgroundColor: `${c.warning}25`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    urgentText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: c.warning },
    cardReason: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.foreground, marginBottom: 2 },
    cardTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.mutedForeground },
    cardBody: { borderTopWidth: 1, borderTopColor: c.border, padding: 14, gap: 12 },
    messages: { gap: 8 },
    msgBubble: { maxWidth: "80%", padding: 10, borderRadius: 10 },
    msgAgent: { backgroundColor: c.primary, alignSelf: "flex-end", borderBottomRightRadius: 3 },
    msgUser: { backgroundColor: c.secondary, alignSelf: "flex-start", borderBottomLeftRadius: 3 },
    msgText: { fontSize: 13, fontFamily: "Inter_400Regular" },
    msgTime: { fontSize: 9, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", marginTop: 3, alignSelf: "flex-end" },
    replyRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
    replyInput: {
      flex: 1,
      backgroundColor: c.secondary,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: c.foreground,
      maxHeight: 100,
    },
    sendBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" },
    sendBtnDisabled: { opacity: 0.4 },
    resolveBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: `${c.success}40`,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
      alignSelf: "flex-start",
    },
    resolveBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.success },
  });
}
