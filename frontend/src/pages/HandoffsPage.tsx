import { useEffect, useState } from "react";
import Header from "../components/Header";
import Spinner from "../components/Spinner";
import { useLanguage } from "../i18n/LanguageProvider";
import { getHandoffs, replyHandoff, resolveHandoff } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { HandoffOut } from "../types/api";
import type { Translations } from "../i18n/translations";

const REASON_KEY: Record<string, keyof Translations> = {
  low_confidence: "lowConfidence",
  user_requested: "userRequested",
  keyword_triggered: "keywordTriggered",
};

export default function HandoffsPage() {
  const { t } = useLanguage();
  const [handoffs, setHandoffs] = useState<HandoffOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [unrepliedOnly, setUnrepliedOnly] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHandoffs()
      .then((data) => {
        setHandoffs(data);
        setSelectedId((prev) => prev ?? data[0]?.id ?? null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.detail : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const visible = unrepliedOnly ? handoffs.filter((h) => h.unreplied) : handoffs;
  const selected = handoffs.find((h) => h.id === selectedId) ?? null;

  const onSend = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      const updated = await replyHandoff(selected.id, reply.trim());
      setHandoffs((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
      setReply("");
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : String(e));
    } finally {
      setSending(false);
    }
  };

  const onResolve = async () => {
    if (!selected) return;
    setError(null);
    try {
      await resolveHandoff(selected.id);
      setHandoffs((prev) => prev.filter((h) => h.id !== selected.id));
      setSelectedId(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : String(e));
    }
  };

  const bubbleClass = (role: string) => {
    if (role === "user") return "bg-slate-100 text-slate-800 me-auto";
    return "bg-indigo-600 text-white ms-auto"; // assistant + agent
  };

  return (
    <>
      <Header title={t("handoffsTitle")} subtitle={t("handoffsSub")} />
      <div className="flex h-[calc(100vh-73px)]">
        {/* Queue */}
        <div className="flex w-80 shrink-0 flex-col border-e border-slate-200 bg-white">
          <label className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={unrepliedOnly}
              onChange={(e) => setUnrepliedOnly(e.target.checked)}
            />
            {t("unrepliedOnly")}
          </label>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <Spinner label={t("loading")} />
            ) : visible.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">{t("noHandoffs")}</p>
            ) : (
              visible.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setSelectedId(h.id)}
                  className={`flex w-full flex-col gap-1 border-b border-slate-100 px-4 py-3 text-start transition-colors ${
                    h.id === selectedId ? "bg-indigo-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">{h.user}</span>
                    {h.unreplied ? <span className="h-2 w-2 rounded-full bg-red-500" /> : null}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="capitalize">{h.channel}</span>
                    <span>{h.timeAgo}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation */}
        <div className="flex flex-1 flex-col">
          {!selected ? (
            <p className="m-auto text-sm text-slate-400">{t("selectHandoff")}</p>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
                <div>
                  <p className="font-medium text-slate-800">{selected.user}</p>
                  <p className="text-xs text-slate-400">
                    {t("reason")}: {t(REASON_KEY[selected.reason] ?? "reason")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onResolve}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t("resolveHandoff")}
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-5">
                {selected.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${bubbleClass(m.role)}`}
                  >
                    <p>{m.content}</p>
                    <p className="mt-1 text-[10px] opacity-70">{m.time}</p>
                  </div>
                ))}
              </div>

              {error ? (
                <p className="bg-red-50 px-5 py-2 text-sm text-red-700">{error}</p>
              ) : null}

              <div className="flex items-end gap-3 border-t border-slate-200 bg-white p-4">
                <textarea
                  rows={2}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={t("replyPlaceholder")}
                  className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={onSend}
                  disabled={sending || !reply.trim()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {t("sendReply")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
