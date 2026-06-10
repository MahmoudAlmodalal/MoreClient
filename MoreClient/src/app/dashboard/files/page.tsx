"use client";

import React, { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { apiGet, apiUpload, apiSend, type FileOut, type UploadResponse } from "@/lib/api";
import { useAsyncOnMount } from "@/lib/use-async-effect";
import {
  UploadCloud,
  File,
  FileSpreadsheet,
  Trash2,
  AlertCircle,
  Database,
  Sparkles
} from "lucide-react";

interface IngestedFile {
  id: number;
  name: string;
  size: string;
  type: string;
  chunks: number;
  date: string;
  status: string;
}

export default function FilesPage() {
  const { t } = useLanguage();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const [files, setFiles] = useState<IngestedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFiles = () => apiGet<FileOut[]>("/api/files");

  const loadFiles = async () => {
    try {
      const rows = await fetchFiles();
      setFiles(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const waitForProcessing = async (fileName: string) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const rows = await fetchFiles();
      setFiles(rows);
      const uploaded = rows.find((row) => row.name === fileName);
      if (!uploaded || uploaded.status !== "Processing") {
        return;
      }
      setProcessingStep("Indexing in the background...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };

  useAsyncOnMount(loadFiles, []);

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
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: globalThis.File) => {
    setError(null);
    setUploading(true);
    setUploadProgress(0);

    const steps = [
      "Reading file contents...",
      "Converting to clean Markdown format...",
      "Creating the knowledge-base record...",
      "Queuing local vector indexing...",
      "Refreshing file status..."
    ];

    setProcessingStep(steps[0]);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const nextProgress = Math.min(prev + 10, 90);
        const stepIndex = Math.min(Math.floor(nextProgress / 20), steps.length - 1);
        setProcessingStep(steps[stepIndex]);
        return nextProgress;
      });
    }, 400);

    try {
      const uploaded = await apiUpload<UploadResponse>("/api/upload", file);
      setUploadProgress(100);
      setProcessingStep(
        uploaded.status === "Processing"
          ? "File saved. Indexing continues in the background..."
          : "File uploaded and indexed."
      );
      await loadFiles();
      if (uploaded.status === "Processing") {
        await waitForProcessing(uploaded.file);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process file");
    } finally {
      clearInterval(interval);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteFile = async (id: number) => {
    const prev = files;
    setFiles(prevFiles => prevFiles.filter(f => f.id !== id));
    try {
      await apiSend("/api/files/" + id, "DELETE");
    } catch (err) {
      setFiles(prev);
      setError(err instanceof Error ? err.message : "Could not delete file");
    }
  };

  return (
    <div className="space-y-8 pb-12 text-foreground">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("filesTitle")}</h2>
        <p className="mt-1 text-sm text-text-muted">{t("filesSub")}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* RAG Pipeline info banner */}
      <div className="rounded-xl border border-border-custom bg-card p-5 flex flex-col md:flex-row items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
          <Database className="h-5 w-5" />
        </div>
        <div className="flex-1 text-sm text-foreground/80">
          <span className="font-bold text-foreground">Demo Vector Pipeline: </span>
          Uploaded docs are parsed into markdown text, split into chunks, and converted into local demo vectors for the frontend preview.
        </div>
        <div className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 font-semibold bg-brand-500/10 px-3 py-1.5 rounded-lg border border-brand-500/20">
          <Sparkles className="h-3.5 w-3.5" />
          Zero External Hallucination
        </div>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
          dragActive
            ? "border-accent bg-accent/5 scale-[0.99]"
            : "border-border-custom bg-card hover:border-accent/50"
        }`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".pdf,.docx,.txt,.xlsx"
          onChange={handleFileInput}
          disabled={uploading}
        />
        
        {uploading ? (
          <div className="w-full max-w-md space-y-4">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span className="font-semibold text-brand-600 dark:text-brand-400">{processingStep}</span>
              <span className="font-mono">{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-background border border-border-custom">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-text-muted animate-pulse">
              The file is saved first; indexing can finish in the background.
            </p>
          </div>
        ) : (
          <label htmlFor="file-upload" className="cursor-pointer group flex flex-col items-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 group-hover:scale-105 transition-transform">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-foreground">
              {t("dropzoneTitle")}
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              {t("dropzoneSub")}
            </p>
          </label>
        )}
      </div>

      {/* Parsed Documents List */}
      <div className="rounded-xl border border-border-custom bg-card p-6">
        <div>
          <h3 className="text-base font-bold text-foreground">{t("fileListTitle")}</h3>
          <p className="text-xs text-text-muted mt-0.5">{t("fileListSub")}</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted">
            <Database className="h-8 w-8 mb-2 animate-pulse text-brand-600 dark:text-brand-400" />
            <p className="text-sm">Loading knowledge bases...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p className="text-sm">No knowledge bases ingested yet. Upload files to get started.</p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground/80">
              <thead className="border-b border-border-custom bg-background text-xs font-semibold uppercase text-text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3">{t("fileName")}</th>
                  <th scope="col" className="px-4 py-3">{t("fileSize")}</th>
                  <th scope="col" className="px-4 py-3">{t("chunksCreated")}</th>
                  <th scope="col" className="px-4 py-3">{t("uploadDate")}</th>
                  <th scope="col" className="px-4 py-3">{t("status")}</th>
                  <th scope="col" className="px-4 py-3 text-center">{t("action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-foreground/5 transition-colors">
                    <td className="px-4 py-4 flex items-center gap-3 font-semibold text-foreground">
                      {/\.xlsx?$/i.test(file.name) ? (
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <File className="h-4 w-4 text-brand-600 dark:text-brand-400 shrink-0" />
                      )}
                      <span className="truncate max-w-xs">{file.name}</span>
                    </td>
                    <td className="px-4 py-4">{file.size}</td>
                    <td className="px-4 py-4 font-mono font-bold text-brand-600 dark:text-brand-400">{file.chunks}</td>
                    <td className="px-4 py-4 text-text-muted">{file.date}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold border ${
                          file.status === "Failed"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                            : file.status === "Processing"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {file.status === "Failed"
                          ? t("failed")
                          : file.status === "Processing"
                          ? t("processing")
                          : t("completed")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors active:scale-90"
                        title={t("deleteFile")}
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
