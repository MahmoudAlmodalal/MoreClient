"use client";

import React, { useState, useSyncExternalStore } from "react";
import { useLanguage } from "@/components/language-provider";
import { apiSend, type SettingsOut } from "@/lib/api";
import { SubscriptionPlans } from "@/components/dashboard/subscription-plans";
import {
  Bot,
  SendHorizontal,
  Smartphone,
  Save,
  Activity,
  Globe,
  Copy,
  Check,
  Upload,
  Trash2,
  Link as LinkIcon,
  ShoppingCart
} from "lucide-react";

const fallbackOrigin = "http://localhost:5000";
const defaultTenantKey = process.env.NEXT_PUBLIC_DEFAULT_TENANT_KEY ?? "telnet";
const subscribeOrigin = () => () => {};
const getClientOrigin = () =>
  typeof window === "undefined" ? fallbackOrigin : window.location.origin;
const getServerOrigin = () => fallbackOrigin;

export default function SettingsPage() {
  const {
    t,
    language,
    companyName,
    setCompanyName,
    botName,
    setBotName,
    companyLogo,
    setCompanyLogo,
    subscriptionPlan,
    setSubscriptionPlan,
    telegramToken,
    setTelegramToken,
    isTelegramActive,
    setIsTelegramActive,
    twilioSid,
    setTwilioSid,
    twilioToken,
    setTwilioToken,
    twilioNumber,
    setTwilioNumber,
    isWhatsappActive,
    setIsWhatsappActive,
    botTone,
    setBotTone,
    systemPromptExtra,
    setSystemPromptExtra,
    purchaseFlowEnabled,
    setPurchaseFlowEnabled,
    purchaseCollectAddress,
    setPurchaseCollectAddress,
    purchaseCollectQuantity,
    setPurchaseCollectQuantity,
    purchaseAutoForwardToSupport,
    setPurchaseAutoForwardToSupport,
    purchaseConfirmationRequired,
    setPurchaseConfirmationRequired,
    purchaseSessionMinutes,
    setPurchaseSessionMinutes,
    purchaseCurrencyLabel,
    setPurchaseCurrencyLabel,
    intentLlmEnabled,
    setIntentLlmEnabled,
    intentConfidenceThreshold,
    setIntentConfidenceThreshold,
    autoHandoffOnComplaint,
    setAutoHandoffOnComplaint
  } = useLanguage();

  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [errorToast, setErrorToast] = useState(false);

  // Dynamic host origin states & Clipboard helpers
  const currentOrigin = useSyncExternalStore(
    subscribeOrigin,
    getClientOrigin,
    getServerOrigin
  );
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);
  const widgetScriptSnippet = `<script src="${currentOrigin}/embed.js" data-tenant-key="${defaultTenantKey}"></script>`;
  const widgetIframeSnippet = `<iframe src="${currentOrigin}/widget?tenantKey=${encodeURIComponent(defaultTenantKey)}" width="380" height="600" style="border:none; border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></iframe>`;

  const copyToClipboard = (text: string, type: "script" | "iframe") => {
    navigator.clipboard.writeText(text);
    if (type === "script") {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else {
      setCopiedIframe(true);
      setTimeout(() => setCopiedIframe(false), 2000);
    }
  };

  // Local mirror states for logo preview
  const [logoDraft, setLogoDraft] = useState({ base: companyLogo, value: companyLogo });
  const logoInput = logoDraft.base === companyLogo ? logoDraft.value : companyLogo;
  const setLogoInput = (value: string) => {
    setLogoDraft({ base: companyLogo, value });
  };
  const [uploadMode, setUploadMode] = useState(true);

  // Keep the local logo mirror in sync once the provider hydrates from backend.
  // Adjusting state during render (instead of an effect) is the React-recommended
  // pattern for deriving state from a changing prop and avoids an extra commit.
  const [prevCompanyLogo, setPrevCompanyLogo] = useState(companyLogo);
  if (companyLogo !== prevCompanyLogo) {
    setPrevCompanyLogo(companyLogo);
    setLogoInput(companyLogo);
  }
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const processFile = (file: File) => {
    setUploadError(null);

    // Validate size (max 2MB = 2 * 1024 * 1024 bytes)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError(t("logoSizeError"));
      return;
    }

    // Validate format (PNG, JPEG, WebP, SVG)
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError(t("logoTypeError"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === "string") {
        setLogoInput(e.target.result);
      }
    };
    reader.onerror = () => {
      setUploadError(language === "ar" ? "حدث خطأ أثناء قراءة الملف." : "Error reading file.");
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemoveLogo = () => {
    setLogoInput("");
    setUploadError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorToast(false);

    // Build a camelCase payload of the editable fields (logo from the local
    // mirror, which holds the freshly uploaded/typed value).
    const payload = {
      companyName,
      botName,
      companyLogo: logoInput,
      botTone,
      systemPromptExtra,
      telegramToken,
      isTelegramActive,
      twilioSid,
      twilioToken,
      twilioNumber,
      isWhatsappActive,
      subscriptionPlan,
      purchaseFlowEnabled,
      purchaseCollectAddress,
      purchaseCollectQuantity,
      purchaseAutoForwardToSupport,
      purchaseConfirmationRequired,
      purchaseSessionMinutes,
      purchaseCurrencyLabel,
      intentLlmEnabled,
      intentConfidenceThreshold,
      autoHandoffOnComplaint,
    };

    try {
      const saved = await apiSend<SettingsOut>("/api/settings", "PUT", payload);

      // Reflect the persisted values back into the shared context so the
      // widget and other pages pick them up immediately.
      setCompanyName(saved.companyName);
      setBotName(saved.botName);
      setCompanyLogo(saved.companyLogo);
      setBotTone(saved.botTone);
      setSystemPromptExtra(saved.systemPromptExtra);
      setTelegramToken(saved.telegramToken ?? "");
      setIsTelegramActive(saved.isTelegramActive);
      setTwilioSid(saved.twilioSid ?? "");
      setTwilioToken(saved.twilioToken ?? "");
      setTwilioNumber(saved.twilioNumber ?? "");
      setIsWhatsappActive(saved.isWhatsappActive);
      setPurchaseFlowEnabled(saved.purchaseFlowEnabled);
      setPurchaseCollectAddress(saved.purchaseCollectAddress);
      setPurchaseCollectQuantity(saved.purchaseCollectQuantity);
      setPurchaseAutoForwardToSupport(saved.purchaseAutoForwardToSupport);
      setPurchaseConfirmationRequired(saved.purchaseConfirmationRequired);
      setPurchaseSessionMinutes(saved.purchaseSessionMinutes);
      setPurchaseCurrencyLabel(saved.purchaseCurrencyLabel);
      setIntentLlmEnabled(saved.intentLlmEnabled);
      setIntentConfidenceThreshold(saved.intentConfidenceThreshold);
      setAutoHandoffOnComplaint(saved.autoHandoffOnComplaint);
      if (saved.subscriptionPlan === "pro" || saved.subscriptionPlan === "ultra") {
        setSubscriptionPlan(saved.subscriptionPlan);
      }

      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
    } catch {
      // On failure, still mirror the logo locally so the preview is consistent.
      setCompanyLogo(logoInput);
      setErrorToast(true);
      setTimeout(() => setErrorToast(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div className={`fixed top-4 ${language === "ar" ? "left-4" : "right-4"} z-50 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-4 duration-200`}>
          {t("saved")}
        </div>
      )}
      {errorToast && (
        <div className={`fixed top-4 ${language === "ar" ? "left-4" : "right-4"} z-50 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-4 duration-200`}>
          {language === "ar" ? "فشل حفظ الإعدادات. حاول مرة أخرى." : "Failed to save settings. Please try again."}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">{t("settingsTitle")}</h2>
        <p className="mt-1 text-sm text-gray-400">{t("settingsSub")}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <div className="rounded-xl border border-border-custom bg-card p-6">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-6">
            <Bot className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            {t("tenantSection")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                {t("companyName")}
              </label>
              <input
                required
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-xl border border-border-custom bg-background px-4 py-2.5 text-sm text-foreground placeholder-text-muted/50 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                {t("botName")}
              </label>
              <input
                required
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                className="w-full rounded-xl border border-border-custom bg-background px-4 py-2.5 text-sm text-foreground placeholder-text-muted/50 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {t("companyLogo")}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode(!uploadMode);
                    setUploadError(null);
                  }}
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {uploadMode ? (
                    <>
                      <LinkIcon className="h-3 w-3" />
                      <span>{t("useUrlInstead")}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3 w-3" />
                      <span>{t("useUploadInstead")}</span>
                    </>
                  )}
                </button>
              </div>

              {uploadMode ? (
                <div>
                  {logoInput ? (
                    <div className="flex items-center justify-between rounded-xl border border-border-custom bg-background p-4">
                      <div className="flex items-center gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logoInput}
                          alt="Logo Preview"
                          className="h-16 w-16 rounded-xl object-cover border border-brand-500/20 shadow-md"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80";
                          }}
                        />
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {language === "ar" ? "شعار الشركة المفعل" : "Active Company Logo"}
                          </p>
                          <p className="text-xs text-text-muted mt-1">
                            {logoInput.startsWith("data:")
                              ? (language === "ar" ? "شعار مرفوع (صيغة Base64)" : "Uploaded Image (Base64 Format)")
                              : (language === "ar" ? "شعار من رابط خارجي" : "External URL Image")}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">{t("removeLogo")}</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById("logo-file-input")?.click()}
                      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${
                        dragActive
                          ? "border-accent bg-accent/5 scale-[0.99]"
                          : "border-border-custom bg-card hover:border-accent/50"
                      }`}
                    >
                      <input
                        type="file"
                        id="logo-file-input"
                        accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 group-hover:scale-105 transition-transform animate-pulse">
                        <Upload className="h-5 w-5" />
                      </div>
                      <p className="mt-3 text-sm font-bold text-foreground">
                        {t("dragDropOrClick")}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {t("fileRequirements")}
                      </p>
                    </div>
                  )}

                  {uploadError && (
                    <p className="mt-2 text-xs font-semibold text-red-400 flex items-center gap-1 animate-in fade-in duration-200">
                      <span>⚠️</span>
                      <span>{uploadError}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex gap-4 items-center">
                  <input
                    type="text"
                    value={logoInput}
                    onChange={(e) => {
                      setLogoInput(e.target.value);
                      setUploadError(null);
                    }}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 rounded-xl border border-border-custom bg-background px-4 py-2.5 text-sm text-foreground placeholder-text-muted/50 focus:border-brand-500 focus:outline-none"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoInput}
                    alt="Preview"
                    className="h-10 w-10 rounded-xl object-cover border border-border-custom"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80";
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                {t("botTone")}
              </label>
              <select
                value={botTone}
                onChange={(e) => setBotTone(e.target.value)}
                className="w-full rounded-xl border border-border-custom bg-background px-4 py-2.5 text-sm text-foreground focus:border-brand-500 focus:outline-none"
              >
                <option value="friendly">{t("toneFriendly")}</option>
                <option value="professional">{t("toneProfessional")}</option>
                <option value="formal">{t("toneFormal")}</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                {t("systemPromptExtra")}
              </label>
              <textarea
                rows={3}
                value={systemPromptExtra}
                onChange={(e) => setSystemPromptExtra(e.target.value)}
                placeholder={t("systemPromptExtraPlaceholder")}
                className="w-full rounded-xl border border-border-custom bg-background p-3 text-sm text-foreground placeholder-text-muted/50 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Channels Integration Credentials Setup */}
        <div className="rounded-xl border border-border-custom bg-card p-6 space-y-6">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            {t("integrationsTitle")}
          </h3>

          {/* Telegram Settings */}
          <div className="rounded-xl border border-border-custom/60 bg-background p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <SendHorizontal className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                {t("telegramConfig")}
              </h4>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTelegramActive}
                  onChange={(e) => setIsTelegramActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-foreground/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>

            {isTelegramActive && (
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">
                  {t("telegramToken")}
                </label>
                <input
                  required
                  type="password"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  className="w-full rounded-xl border border-border-custom bg-background px-4 py-2.5 text-xs text-foreground focus:border-brand-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* WhatsApp Settings */}
          <div className="rounded-xl border border-border-custom/60 bg-background p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {t("whatsappConfig")}
              </h4>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWhatsappActive}
                  onChange={(e) => setIsWhatsappActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-foreground/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>

            {isWhatsappActive && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">
                    {t("twilioSid")}
                  </label>
                  <input
                    required
                    type="text"
                    value={twilioSid}
                    onChange={(e) => setTwilioSid(e.target.value)}
                    className="w-full rounded-xl border border-border-custom bg-card px-4 py-2.5 text-xs text-foreground focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">
                    {t("twilioToken")}
                  </label>
                  <input
                    required
                    type="password"
                    value={twilioToken}
                    onChange={(e) => setTwilioToken(e.target.value)}
                    className="w-full rounded-xl border border-border-custom bg-card px-4 py-2.5 text-xs text-foreground focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">
                    {t("twilioNumber")}
                  </label>
                  <input
                    required
                    type="text"
                    value={twilioNumber}
                    onChange={(e) => setTwilioNumber(e.target.value)}
                    className="w-full rounded-xl border border-border-custom bg-card px-4 py-2.5 text-xs text-foreground focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Purchase Flow Automation */}
        <div className="rounded-xl border border-border-custom bg-card p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              {t("purchaseFlowTitle")}
            </h3>
            <p className="mt-1 text-xs text-text-muted">{t("purchaseFlowSub")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              [t("purchaseFlowEnabled"), purchaseFlowEnabled, setPurchaseFlowEnabled],
              [t("purchaseCollectQuantity"), purchaseCollectQuantity, setPurchaseCollectQuantity],
              [t("purchaseCollectAddress"), purchaseCollectAddress, setPurchaseCollectAddress],
              [t("purchaseAutoForward"), purchaseAutoForwardToSupport, setPurchaseAutoForwardToSupport],
              [t("purchaseConfirmationRequired"), purchaseConfirmationRequired, setPurchaseConfirmationRequired],
              [t("intentLlmEnabled"), intentLlmEnabled, setIntentLlmEnabled],
              [t("autoHandoffOnComplaint"), autoHandoffOnComplaint, setAutoHandoffOnComplaint],
            ].map(([label, checked, setter]) => (
              <label
                key={String(label)}
                className="flex items-center justify-between gap-4 rounded-xl border border-border-custom bg-background px-4 py-3"
              >
                <span className="text-sm font-semibold text-foreground/80">{String(label)}</span>
                <input
                  type="checkbox"
                  checked={Boolean(checked)}
                  onChange={(e) => (setter as (val: boolean) => void)(e.target.checked)}
                  className="h-4 w-4 rounded border-border-custom bg-card text-brand-600 focus:ring-brand-500"
                />
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">
                {t("purchaseSessionMinutes")}
              </label>
              <input
                type="number"
                min={5}
                max={240}
                value={purchaseSessionMinutes}
                onChange={(e) => setPurchaseSessionMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-border-custom bg-background px-4 py-2.5 text-sm text-foreground focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">
                {t("purchaseCurrencyLabel")}
              </label>
              <input
                type="text"
                value={purchaseCurrencyLabel}
                onChange={(e) => setPurchaseCurrencyLabel(e.target.value)}
                className="w-full rounded-xl border border-border-custom bg-background px-4 py-2.5 text-sm text-foreground focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">
                {t("intentConfidenceThreshold")}
              </label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={intentConfidenceThreshold}
                onChange={(e) => setIntentConfidenceThreshold(Number(e.target.value))}
                className="w-full rounded-xl border border-border-custom bg-background px-4 py-2.5 text-sm text-foreground focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Web Widget Integration Card */}
        <div className="rounded-xl border border-border-custom bg-card p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Globe className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              {t("widgetIntegrationTitle")}
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              {t("widgetIntegrationSub")}
            </p>
          </div>

          {/* Script Snippet Block */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted uppercase">
                {t("widgetScriptLabel")}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(widgetScriptSnippet, "script")}
                className="flex items-center gap-1.5 rounded-lg border border-border-custom bg-background px-3 py-1.5 text-xs text-brand-600 dark:text-brand-400 hover:text-foreground transition-colors cursor-pointer"
              >
                {copiedScript ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 animate-in zoom-in duration-200" />
                    <span className="text-emerald-600 dark:text-emerald-400">{t("copied")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>{t("copySnippet")}</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <pre className="overflow-x-auto rounded-xl border border-border-custom bg-background p-4 text-xs font-mono text-brand-700 dark:text-brand-300">
                <code>{widgetScriptSnippet}</code>
              </pre>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              {t("widgetIntegrationInstructions")}
            </p>
          </div>

          {/* Iframe Snippet Block */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted uppercase">
                {t("widgetIframeLabel")}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(widgetIframeSnippet, "iframe")}
                className="flex items-center gap-1.5 rounded-lg border border-border-custom bg-background px-3 py-1.5 text-xs text-brand-600 dark:text-brand-400 hover:text-foreground transition-colors cursor-pointer"
              >
                {copiedIframe ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 animate-in zoom-in duration-200" />
                    <span className="text-emerald-600 dark:text-emerald-400">{t("copied")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>{t("copySnippet")}</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <pre className="overflow-x-auto rounded-xl border border-border-custom bg-background p-4 text-xs font-mono text-brand-700 dark:text-brand-300">
                <code>{widgetIframeSnippet}</code>
              </pre>
            </div>
          </div>
        </div>

        <SubscriptionPlans />

        {/* Submit Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-hover px-6 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-55 transition-colors cursor-pointer active:scale-95"
          >
            <Save className="h-4.5 w-4.5" />
            <span>{saving ? t("saving") : t("save")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
