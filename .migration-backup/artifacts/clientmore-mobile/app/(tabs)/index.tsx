import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { fetchAnalytics, type AnalyticsResponse } from "@/lib/api";

type KpiCard = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  sub?: string;
};

function buildKpiCards(
  data: AnalyticsResponse,
  colors: ReturnType<typeof useColors>
): KpiCard[] {
  const k = data.kpis;
  return [
    {
      label: "Total Questions",
      value: String(k.total_questions),
      icon: "chatbubble-ellipses-outline",
      color: colors.primary,
      sub: "all time",
    },
    {
      label: "Deflection Rate",
      value: `${(k.deflection_rate * 100).toFixed(1)}%`,
      icon: "trending-up-outline",
      color: colors.success,
      sub: "bot resolved",
    },
    {
      label: "Est. Savings",
      value: `$${k.cost_savings.toLocaleString()}`,
      icon: "cash-outline",
      color: "#10b981",
      sub: "vs human agents",
    },
    {
      label: "Customer CSAT",
      value: k.feedback_score ? k.feedback_score.toFixed(1) : "—",
      icon: "star-outline",
      color: colors.warning,
      sub: "out of 5",
    },
  ];
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
  });

  const s = makeStyles(colors, insets);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>clientMORE</Text>
          <Text style={s.subtitle}>Business Analytics</Text>
        </View>
        <Pressable onPress={() => refetch()} hitSlop={8} style={s.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={s.loaderText}>Loading analytics…</Text>
        </View>
      ) : isError ? (
        <View style={s.errorBox}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.destructive} />
          <Text style={s.errorTitle}>Couldn't load data</Text>
          <Text style={s.errorSub}>Make sure the backend is running.</Text>
          <Pressable style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : data ? (
        <>
          <View style={s.kpiGrid}>
            {buildKpiCards(data, colors).map((card) => (
              <View key={card.label} style={s.kpiCard}>
                <View style={[s.kpiIconWrap, { backgroundColor: `${card.color}18` }]}>
                  <Ionicons name={card.icon} size={18} color={card.color} />
                </View>
                <Text style={s.kpiValue}>{card.value}</Text>
                <Text style={s.kpiLabel}>{card.label}</Text>
                {card.sub ? <Text style={s.kpiSub}>{card.sub}</Text> : null}
              </View>
            ))}
          </View>

          {data.top_questions.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Top Repeated Questions</Text>
              {data.top_questions.slice(0, 5).map((q, i) => (
                <View key={i} style={s.questionRow}>
                  <View style={s.rankWrap}>
                    <Text style={s.rankText}>{i + 1}</Text>
                  </View>
                  <Text style={s.questionText} numberOfLines={2}>{q.name}</Text>
                  <View style={s.countWrap}>
                    <Text style={s.countText}>{q.count}×</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {data.channel_distribution.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Channel Distribution</Text>
              {data.channel_distribution.map((ch, i) => {
                const total = data.channel_distribution.reduce((a, b) => a + b.value, 0);
                const pct = total > 0 ? (ch.value / total) * 100 : 0;
                const cc = ["#8b5cf6", "#10b981", "#f59e0b", "#3b82f6"][i % 4];
                return (
                  <View key={ch.name} style={s.channelRow}>
                    <View style={s.channelLeft}>
                      <View style={[s.channelDot, { backgroundColor: cc }]} />
                      <Text style={s.channelName}>{ch.name}</Text>
                    </View>
                    <View style={s.barWrap}>
                      <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: cc }]} />
                    </View>
                    <Text style={s.channelPct}>{pct.toFixed(0)}%</Text>
                  </View>
                );
              })}
            </View>
          )}

          {data.unanswered.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionRow}>
                <Text style={s.sectionTitle}>Unanswered Queue</Text>
                <View style={s.badge}>
                  <Text style={s.badgeText}>{data.unanswered.length}</Text>
                </View>
              </View>
              {data.unanswered.slice(0, 5).map((item) => (
                <View key={item.id} style={s.uqRow}>
                  <View style={s.uqLeft}>
                    <Text style={s.uqQ} numberOfLines={2}>{item.question}</Text>
                    <Text style={s.uqMeta}>{item.channel} · {item.language.toUpperCase()} · {item.timeAgo}</Text>
                  </View>
                  <View style={[s.confPill, { backgroundColor: item.confidence > 0.4 ? "#f59e0b18" : "#ef444418" }]}>
                    <Text style={[s.confText, { color: item.confidence > 0.4 ? colors.warning : colors.destructive }]}>
                      {(item.confidence * 100).toFixed(0)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) {
  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    content: { paddingTop: topPad, paddingHorizontal: 16, paddingBottom: insets.bottom + 100 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
    greeting: { fontSize: 22, fontFamily: "Inter_700Bold", color: c.foreground },
    subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 2 },
    refreshBtn: { padding: 8, backgroundColor: c.card, borderRadius: 10, borderWidth: 1, borderColor: c.border },
    loader: { alignItems: "center", marginTop: 80, gap: 12 },
    loaderText: { fontSize: 14, fontFamily: "Inter_400Regular", color: c.mutedForeground },
    errorBox: { alignItems: "center", marginTop: 60, gap: 8 },
    errorTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.foreground },
    errorSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.mutedForeground },
    retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.primary, borderRadius: 10 },
    retryText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#fff" },
    kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
    kpiCard: { width: "48%", backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16 },
    kpiIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
    kpiValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: c.foreground },
    kpiLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.mutedForeground, marginTop: 2 },
    kpiSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 1 },
    section: { marginBottom: 16, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
    sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.foreground, padding: 14, paddingBottom: 8 },
    sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, paddingBottom: 8 },
    badge: { backgroundColor: c.primary, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
    badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#fff" },
    questionRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border, gap: 10 },
    rankWrap: { width: 22, height: 22, borderRadius: 6, backgroundColor: c.secondary, alignItems: "center", justifyContent: "center" },
    rankText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: c.mutedForeground },
    questionText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: c.foreground },
    countWrap: { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: `${c.primary}18`, borderRadius: 6 },
    countText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: c.primary },
    channelRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border, gap: 10 },
    channelLeft: { flexDirection: "row", alignItems: "center", gap: 8, width: 90 },
    channelDot: { width: 8, height: 8, borderRadius: 4 },
    channelName: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.foreground },
    barWrap: { flex: 1, height: 6, backgroundColor: c.secondary, borderRadius: 3, overflow: "hidden" },
    barFill: { height: 6, borderRadius: 3 },
    channelPct: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.mutedForeground, width: 32, textAlign: "right" },
    uqRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border, gap: 10 },
    uqLeft: { flex: 1, gap: 4 },
    uqQ: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.foreground },
    uqMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.mutedForeground },
    confPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    confText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  });
}
