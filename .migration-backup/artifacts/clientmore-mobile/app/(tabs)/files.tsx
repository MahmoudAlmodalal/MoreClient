import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { deleteFile, fetchFiles, uploadFile, type FileOut } from "@/lib/api";

const FILE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  pdf: "document-text",
  doc: "document-text",
  docx: "document-text",
  txt: "document-text",
  csv: "grid",
  xlsx: "grid",
  xls: "grid",
  json: "code-slash",
};

function fileIcon(name: string): keyof typeof Ionicons.glyphMap {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return FILE_ICONS[ext] ?? "document-outline";
}

function statusColor(status: string, c: ReturnType<typeof useColors>) {
  const s = status.toLowerCase();
  if (s === "indexed") return c.success;
  if (s === "processing") return c.warning;
  if (s === "failed") return c.destructive;
  return c.mutedForeground;
}

export default function FilesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: files = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["files"],
    queryFn: fetchFiles,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteFile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });

  function confirmDelete(file: FileOut) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete file",
      `Remove "${file.name}" from the knowledge base?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMut.mutate(file.id),
        },
      ]
    );
  }

  async function handleUpload() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setUploading(true);

      const asset = result.assets[0];
      await uploadFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
      });
      await qc.invalidateQueries({ queryKey: ["files"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUploading(false);
    }
  }

  const s = makeStyles(colors, insets);

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <View>
          <Text style={s.title}>Knowledge Base</Text>
          <Text style={s.subtitle}>{files.length} file{files.length !== 1 ? "s" : ""}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [s.uploadBtn, pressed && { opacity: 0.8 }]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
              <Text style={s.uploadBtnText}>Upload</Text>
            </>
          )}
        </Pressable>
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
            <Text style={s.loaderText}>Loading files…</Text>
          </View>
        ) : isError ? (
          <View style={s.center}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.destructive} />
            <Text style={s.errorTitle}>Couldn't load files</Text>
            <Pressable style={s.retryBtn} onPress={() => refetch()}>
              <Text style={s.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : files.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="documents-outline" size={36} color={colors.primary} />
            </View>
            <Text style={s.emptyTitle}>No files yet</Text>
            <Text style={s.emptySub}>Upload PDFs, DOCX or TXT files to train the bot.</Text>
          </View>
        ) : (
          files.map((file) => (
            <View key={file.id} style={s.fileRow}>
              <View style={s.fileIcon}>
                <Ionicons name={fileIcon(file.name)} size={20} color={colors.primary} />
              </View>
              <View style={s.fileMeta}>
                <Text style={s.fileName} numberOfLines={1}>{file.name}</Text>
                <Text style={s.fileInfo}>
                  {file.size} · {file.chunks} chunk{file.chunks !== 1 ? "s" : ""} · {file.date}
                </Text>
                <View style={[s.statusPill, { backgroundColor: `${statusColor(file.status, colors)}18` }]}>
                  <View style={[s.statusDot, { backgroundColor: statusColor(file.status, colors) }]} />
                  <Text style={[s.statusText, { color: statusColor(file.status, colors) }]}>
                    {file.status}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => confirmDelete(file)}
                hitSlop={8}
                style={s.deleteBtn}
                disabled={deleteMut.isPending}
              >
                <Ionicons name="trash-outline" size={18} color={colors.destructive} />
              </Pressable>
            </View>
          ))
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
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: c.background,
    },
    title: { fontSize: 22, fontFamily: "Inter_700Bold", color: c.foreground },
    subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 2 },
    uploadBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.primary,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
    },
    uploadBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#fff" },
    list: { flex: 1 },
    listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 100 },
    center: { alignItems: "center", marginTop: 60, gap: 10 },
    loaderText: { fontSize: 14, fontFamily: "Inter_400Regular", color: c.mutedForeground },
    errorTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.foreground },
    retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.primary, borderRadius: 10 },
    retryText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#fff" },
    empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 32 },
    emptyIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: `${c.primary}18`, alignItems: "center", justifyContent: "center", marginBottom: 16 },
    emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.foreground },
    emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.mutedForeground, textAlign: "center", marginTop: 6 },
    fileRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 10,
      gap: 12,
    },
    fileIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: `${c.primary}18`, alignItems: "center", justifyContent: "center" },
    fileMeta: { flex: 1, gap: 4 },
    fileName: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.foreground },
    fileInfo: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.mutedForeground },
    statusPill: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    statusDot: { width: 5, height: 5, borderRadius: 2.5 },
    statusText: { fontSize: 10, fontFamily: "Inter_500Medium" },
    deleteBtn: { padding: 6 },
  });
}
