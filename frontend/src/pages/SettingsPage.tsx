import { useEffect, useState } from "react";
import Header from "../components/Header";
import Spinner from "../components/Spinner";
import LanguageToggle from "../components/LanguageToggle";
import { useLanguage } from "../i18n/LanguageProvider";
import { getSettings, updateSettings } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { SettingsOut, SettingsUpdate } from "../types/api";

type FormState = Pick<SettingsOut, "companyName" | "botName" | "systemPromptExtra" | "botTone">;

const TONES: { value: string; key: "toneProfessional" | "toneFriendly" | "toneFormal" }[] = [
  { value: "professional", key: "toneProfessional" },
  { value: "friendly", key: "toneFriendly" },
  { value: "formal", key: "toneFormal" },
];

export default function SettingsPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    companyName: "",
    botName: "",
    systemPromptExtra: "",
    botTone: "professional",
  });

  useEffect(() => {
    let active = true;
    getSettings()
      .then((s) => {
        if (!active) return;
        setForm({
          companyName: s.companyName,
          botName: s.botName,
          systemPromptExtra: s.systemPromptExtra,
          botTone: s.botTone,
        });
      })
      .catch((e) => active && setError(e instanceof ApiError ? e.detail : String(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const update = (patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setSaved(false);
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const body: SettingsUpdate = { ...form };
      const updated = await updateSettings(body);
      setForm({
        companyName: updated.companyName,
        botName: updated.botName,
        systemPromptExtra: updated.systemPromptExtra,
        botTone: updated.botTone,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header title={t("settingsTitle")} subtitle={t("settingsSub")} />
      <div className="mx-auto max-w-2xl p-6">
        {loading ? (
          <Spinner label={t("loading")} />
        ) : (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">{t("tenantSection")}</h2>

              <label className="mb-4 block">
                <span className="mb-1 block text-sm font-medium text-slate-600">{t("companyName")}</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  value={form.companyName}
                  onChange={(e) => update({ companyName: e.target.value })}
                />
              </label>

              <label className="mb-4 block">
                <span className="mb-1 block text-sm font-medium text-slate-600">{t("botName")}</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  value={form.botName}
                  onChange={(e) => update({ botName: e.target.value })}
                />
              </label>

              <label className="mb-4 block">
                <span className="mb-1 block text-sm font-medium text-slate-600">{t("botTone")}</span>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  value={form.botTone}
                  onChange={(e) => update({ botTone: e.target.value })}
                >
                  {TONES.map((tone) => (
                    <option key={tone.value} value={tone.value}>
                      {t(tone.key)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-600">{t("systemPromptExtra")}</span>
                <textarea
                  rows={4}
                  placeholder={t("systemPromptExtraPlaceholder")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  value={form.systemPromptExtra}
                  onChange={(e) => update({ systemPromptExtra: e.target.value })}
                />
              </label>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">{t("interfaceLanguage")}</h2>
              <LanguageToggle />
            </section>

            {error ? (
              <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? t("saving") : t("save")}
              </button>
              {saved ? <span className="text-sm text-green-600">{t("saved")}</span> : null}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
