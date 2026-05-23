import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import Spinner from "../components/Spinner";
import { useLanguage } from "../i18n/LanguageProvider";
import { getFiles, uploadFile, deleteFile } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { FileOut } from "../types/api";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Completed: "bg-green-50 text-green-700",
    Processing: "bg-amber-50 text-amber-700",
    Failed: "bg-red-50 text-red-700",
  };
  const cls = styles[status] ?? "bg-slate-100 text-slate-600";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}

export default function FilesPage() {
  const { t } = useLanguage();
  const [files, setFiles] = useState<FileOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = () =>
    getFiles()
      .then(setFiles)
      .catch((e) => setError(e instanceof ApiError ? e.detail : String(e)))
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
  }, []);

  // Poll while any document is still processing so the status badge updates.
  useEffect(() => {
    if (!files.some((f) => f.status === "Processing")) return;
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [files]);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      await uploadFile(file);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : String(e));
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onDelete = async (id: number) => {
    setError(null);
    try {
      await deleteFile(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : String(e));
    }
  };

  return (
    <>
      <Header title={t("filesTitle")} subtitle={t("filesSub")} />
      <div className="space-y-6 p-6">
        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
            dragOver ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-white hover:bg-slate-50"
          }`}
        >
          <p className="text-sm font-medium text-slate-700">
            {uploading ? t("uploading") : t("dropzoneTitle")}
          </p>
          <p className="mt-1 text-xs text-slate-400">{t("dropzoneSub")}</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        {/* File list */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">
            {t("fileListTitle")}
          </h2>
          {loading ? (
            <Spinner label={t("loading")} />
          ) : files.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">{t("noFiles")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-start text-xs uppercase text-slate-400">
                  <th className="px-5 py-2 text-start font-medium">{t("fileName")}</th>
                  <th className="px-5 py-2 text-start font-medium">{t("fileSize")}</th>
                  <th className="px-5 py-2 text-start font-medium">{t("fileType")}</th>
                  <th className="px-5 py-2 text-start font-medium">{t("chunksCreated")}</th>
                  <th className="px-5 py-2 text-start font-medium">{t("uploadDate")}</th>
                  <th className="px-5 py-2 text-start font-medium">{t("status")}</th>
                  <th className="px-5 py-2 text-end font-medium">{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-medium text-slate-700">{f.name}</td>
                    <td className="px-5 py-3 text-slate-500">{f.size}</td>
                    <td className="px-5 py-3 uppercase text-slate-500">{f.type}</td>
                    <td className="px-5 py-3 text-slate-500">{f.chunks}</td>
                    <td className="px-5 py-3 text-slate-500">{f.date}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="px-5 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => onDelete(f.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        {t("deleteFile")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
