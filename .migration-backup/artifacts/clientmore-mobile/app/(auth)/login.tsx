import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth-context";
import { login } from "@/lib/api";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    setError("");
    try {
      const session = await login(email.trim(), password);
      await setAuth(session.token, session.role);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message ?? "Login failed. Check your credentials.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  const s = makeStyles(colors, insets);

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={["#050508", "#0d0720", "#050508"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      {/* Purple glow orb */}
      <View style={s.glowOrb} />

      <View style={s.inner}>
        {/* Logo + branding */}
        <View style={s.brand}>
          <View style={s.logoRing}>
            <LinearGradient
              colors={["#8b5cf6", "#7c3aed"]}
              style={s.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={s.logoLetter}>M</Text>
            </LinearGradient>
          </View>
          <Text style={s.appName}>clientMORE</Text>
          <Text style={s.tagline}>Your AI support command center</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Sign in</Text>

          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={14} color={colors.destructive} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <View style={s.field}>
            <Text style={s.label}>EMAIL</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="name@company.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              autoComplete="email"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>PASSWORD</Text>
            <View style={s.pwRow}>
              <TextInput
                style={[s.input, { flex: 1, borderWidth: 0 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPw}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                autoComplete="password"
              />
              <Pressable
                onPress={() => setShowPw((v) => !v)}
                style={s.eyeBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showPw ? "eye-off" : "eye"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient
              colors={["#8b5cf6", "#7c3aed"]}
              style={s.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.btnText}>Sign in</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        <Text style={s.footer}>Built in Gaza · Deployed Globally</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    glowOrb: {
      position: "absolute",
      top: -80,
      left: "15%",
      width: 320,
      height: 320,
      borderRadius: 160,
      backgroundColor: "#8b5cf6",
      opacity: 0.07,
    },
    inner: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: insets.top + 60,
      paddingBottom: insets.bottom + 32,
      justifyContent: "center",
    },
    brand: { alignItems: "center", marginBottom: 40 },
    logoRing: {
      width: 72,
      height: 72,
      borderRadius: 22,
      overflow: "hidden",
      marginBottom: 16,
      shadowColor: "#8b5cf6",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 12,
    },
    logoGradient: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    logoLetter: {
      fontSize: 32,
      fontFamily: "Inter_700Bold",
      color: "#fff",
    },
    appName: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: c.foreground,
      letterSpacing: -0.5,
    },
    tagline: {
      marginTop: 6,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: c.mutedForeground,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardTitle: {
      fontSize: 20,
      fontFamily: "Inter_600SemiBold",
      color: c.foreground,
      marginBottom: 20,
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: `${c.destructive}18`,
      borderRadius: 8,
      padding: 10,
      marginBottom: 16,
    },
    errorText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: c.destructive,
      flex: 1,
    },
    field: { marginBottom: 16 },
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
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: c.foreground,
    },
    pwRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.secondary,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
    },
    eyeBtn: { padding: 4 },
    btn: {
      borderRadius: 12,
      overflow: "hidden",
      marginTop: 8,
      shadowColor: "#8b5cf6",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    btnGradient: {
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    btnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
    footer: {
      marginTop: 32,
      textAlign: "center",
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: c.mutedForeground,
    },
  });
}
