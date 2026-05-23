"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/components/language-provider";
import {
  Settings,
  Bot,
  SendHorizontal,
  Smartphone,
  CreditCard,
  CheckCircle2,
  Sparkles,
  Save,
  Activity,
  Globe,
  Copy,
  Check,
  Upload,
  Trash2,
  Link as LinkIcon
} from "lucide-react";

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
    usedMessages,
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
    setSystemPromptExtra
  } = useLanguage();

  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Dynamic host origin states & Clipboard helpers
  const [currentOrigin, setCurrentOrigin] = useState("http://localhost:3000");
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

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
  const [logoInput, setLogoInput] = useState(companyLogo);
  const [uploadMode, setUploadMode] = useState(true);
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    setTimeout(() => {
      setCompanyLogo(logoInput);
      setSaving(false);
      setSuccessToast(true);

      setTimeout(() => {
        setSuccessToast(false);
      }, 3000);
    }, 800);
  };

  const limit = subscriptionPlan === "pro" ? 500 : 1500;
  const usagePercentage = Math.min((usedMessages / limit) * 100, 100);

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-4 duration-200">
          {t("saved")}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">{t("settingsTitle")}</h2>
        <p className="mt-1 text-sm text-gray-400">{t("settingsSub")}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <div className="rounded-xl border border-[#1f1f2e] bg-[#0d0d15] p-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-6">
            <Bot className="h-5 w-5 text-purple-400" />
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
                className="w-full rounded-xl border border-[#1f1f2e] bg-[#07070b] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
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
                className="w-full rounded-xl border border-[#1f1f2e] bg-[#07070b] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
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
                  className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer"
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
                    <div className="flex items-center justify-between rounded-xl border border-[#1f1f2e] bg-[#07070b] p-4">
                      <div className="flex items-center gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logoInput}
                          alt="Logo Preview"
                          className="h-16 w-16 rounded-xl object-cover border border-purple-500/20 shadow-md"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80";
                          }}
                        />
                        <div>
                          <p className="text-sm font-bold text-white">
                            {language === "ar" ? "شعار الشركة المفعل" : "Active Company Logo"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {logoInput.startsWith("data:")
                              ? (language === "ar" ? "شعار مرفوع (صيغة Base64)" : "Uploaded Image (Base64 Format)")
                              : (language === "ar" ? "شعار من رابط خارجي" : "External URL Image")}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
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
                          ? "border-purple-500 bg-purple-500/5 scale-[0.99]"
                          : "border-[#1f1f2e] bg-[#0d0d15] hover:border-[#2e2e42]"
                      }`}
                    >
                      <input
                        type="file"
                        id="logo-file-input"
                        accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 hover:scale-110 transition-transform">
                        <Upload className="h-5 w-5" />
                      </div>
                      <p className="mt-3 text-sm font-bold text-white">
                        {t("dragDropOrClick")}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
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
                    className="flex-1 rounded-xl border border-[#1f1f2e] bg-[#07070b] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoInput}
                    alt="Preview"
                    className="h-10 w-10 rounded-xl object-cover border border-[#1f1f2e]"
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
                className="w-full rounded-xl border border-[#1f1f2e] bg-[#07070b] px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
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
                className="w-full rounded-xl border border-[#1f1f2e] bg-[#07070b] p-3 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Channels Integration Credentials Setup */}
        <div className="rounded-xl border border-[#1f1f2e] bg-[#0d0d15] p-6 space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            {t("integrationsTitle")}
          </h3>

          {/* Telegram Settings */}
          <div className="rounded-xl border border-[#1f1f2e]/60 bg-[#07070b] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <SendHorizontal className="h-4 w-4 text-blue-400" />
                {t("telegramConfig")}
              </h4>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTelegramActive}
                  onChange={(e) => setIsTelegramActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
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
                  className="w-full rounded-xl border border-[#1f1f2e] bg-[#0d0d15] px-4 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* WhatsApp Settings */}
          <div className="rounded-xl border border-[#1f1f2e]/60 bg-[#07070b] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-400" />
                {t("whatsappConfig")}
              </h4>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWhatsappActive}
                  onChange={(e) => setIsWhatsappActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
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
                    className="w-full rounded-xl border border-[#1f1f2e] bg-[#0d0d15] px-4 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
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
                    className="w-full rounded-xl border border-[#1f1f2e] bg-[#0d0d15] px-4 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
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
                    className="w-full rounded-xl border border-[#1f1f2e] bg-[#0d0d15] px-4 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Web Widget Integration Card */}
        <div className="rounded-xl border border-[#1f1f2e] bg-[#0d0d15] p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-purple-400" />
              {t("widgetIntegrationTitle")}
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              {t("widgetIntegrationSub")}
            </p>
          </div>

          {/* Script Snippet Block */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase">
                {t("widgetScriptLabel")}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(`<script src="${currentOrigin}/embed.js"></script>`, "script")}
                className="flex items-center gap-1.5 rounded-lg border border-[#1f1f2e] bg-[#07070b] px-3 py-1.5 text-xs text-purple-400 hover:text-white transition-colors"
              >
                {copiedScript ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400 animate-in zoom-in duration-200" />
                    <span className="text-emerald-400">{t("copied")}</span>
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
              <pre className="overflow-x-auto rounded-xl border border-[#1f1f2e] bg-[#07070b] p-4 text-xs font-mono text-purple-300">
                <code>{`<script src="${currentOrigin}/embed.js"></script>`}</code>
              </pre>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              {t("widgetIntegrationInstructions")}
            </p>
          </div>

          {/* Iframe Snippet Block */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase">
                {t("widgetIframeLabel")}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(`<iframe src="${currentOrigin}/widget" width="380" height="600" style="border:none; border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></iframe>`, "iframe")}
                className="flex items-center gap-1.5 rounded-lg border border-[#1f1f2e] bg-[#07070b] px-3 py-1.5 text-xs text-purple-400 hover:text-white transition-colors"
              >
                {copiedIframe ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400 animate-in zoom-in duration-200" />
                    <span className="text-emerald-400">{t("copied")}</span>
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
              <pre className="overflow-x-auto rounded-xl border border-[#1f1f2e] bg-[#07070b] p-4 text-xs font-mono text-purple-300">
                <code>{`<iframe src="${currentOrigin}/widget" width="380" height="600" style="border: none;"></iframe>`}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Subscription Plan Card */}
        <div className="rounded-xl border border-[#1f1f2e] bg-[#0d0d15] p-6 space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-purple-400" />
            {t("billingTitle")}
          </h3>

          {/* Usage Status Bar */}
          <div className="rounded-xl bg-[#07070b] p-4 border border-[#1f1f2e]/60 space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold text-purple-400">
                {t("usageRatio", { used: usedMessages, limit })}
              </span>
              <span className="font-mono font-bold text-white uppercase">{subscriptionPlan}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#0d0d15]">
              <div
                className="h-full bg-purple-600 transition-all duration-300"
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Pro Plan Box */}
            <div className={`rounded-xl border p-5 flex flex-col justify-between ${
              subscriptionPlan === "pro"
                ? "border-purple-500 bg-purple-500/5"
                : "border-[#1f1f2e]"
            }`}>
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{t("planPro")}</h4>
                  {subscriptionPlan === "pro" && (
                    <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-bold text-purple-400 ring-1 ring-inset ring-purple-500/20">
                      {t("activePlan")}
                    </span>
                  )}
                </div>
                <p className="text-xl font-extrabold text-white mt-2">{t("proPrice")}</p>
                <ul className="text-xs text-gray-400 mt-4 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-400" />
                    {t("proLimit")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-400" />
                    Bilingual RAG QA
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-400" />
                    ChromaDB Vector Store
                  </li>
                </ul>
              </div>

              {subscriptionPlan !== "pro" && (
                <button
                  type="button"
                  onClick={() => setSubscriptionPlan("pro")}
                  className="w-full mt-6 rounded-xl border border-[#1f1f2e] bg-[#07070b] py-2 text-xs font-bold text-gray-300 hover:bg-[#1a1a26]"
                >
                  {t("downgradeToPro")}
                </button>
              )}
            </div>

            {/* Ultra Plan Box */}
            <div className={`rounded-xl border p-5 flex flex-col justify-between ${
              subscriptionPlan === "ultra"
                ? "border-purple-500 bg-purple-500/5 glow-purple"
                : "border-[#1f1f2e] hover:border-purple-500/25"
            }`}>
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    {t("planUltra")}
                    <Sparkles className="h-4 w-4 text-yellow-400" />
                  </h4>
                  {subscriptionPlan === "ultra" && (
                    <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-bold text-purple-400 ring-1 ring-inset ring-purple-500/20">
                      {t("activePlan")}
                    </span>
                  )}
                </div>
                <p className="text-xl font-extrabold text-white mt-2">{t("ultraPrice")}</p>
                <ul className="text-xs text-gray-400 mt-4 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-400" />
                    {t("ultraLimit")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-400" />
                    All Pro benefits + SLA guarantee
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-400" />
                    Dedicated Priority Support Handoff
                  </li>
                </ul>
              </div>

              {subscriptionPlan !== "ultra" && (
                <button
                  type="button"
                  onClick={() => setSubscriptionPlan("ultra")}
                  className="w-full mt-6 rounded-xl bg-purple-600 py-2 text-xs font-bold text-white hover:bg-purple-500"
                >
                  {t("upgradeToUltra")}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-purple-600/10 disabled:opacity-55 transition-colors cursor-pointer"
          >
            <Save className="h-4.5 w-4.5" />
            <span>{saving ? t("saving") : t("save")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
