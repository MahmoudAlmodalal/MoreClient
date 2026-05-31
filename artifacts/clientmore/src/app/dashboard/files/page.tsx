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

  // Poll the file status. First 20 attempts at 1s (typical small docs finish
  // here), then back off to 30s so large files don't hammer the API while
  // still letting the agent know the upload is alive. PRD B5.
  const waitForProcessing = async (fileName: string) => {
    const FAST_ATTEMPTS = 20;
    const FAST_DELAY = 1000;
    const SLOW_ATTEMPTS = 20; // up to ~10 more minutes
    const SLOW_DELAY = 30_000;
    let switched = false;

    for (let attempt = 0; attempt < FAST_ATTEMPTS + SLOW_ATTEMPTS; attempt += 1) {
      const rows = await fetchFiles();
      setFiles(rows);
      const uploaded = rows.find((row) => row.name === fileName);
      if (!uploaded || uploaded.status !== "processing") {
        return;
      }
      if (attempt < FAST_ATTEMPTS) {
        setProcessingStep("Indexing in the background...");
        await new Promise((resolve) => setTimeout(resolve, FAST_DELAY));
      } else {
        if (!switched) {
          switched = true;
          setProcessingStep("Still processing — large files can take a minute.");
        }
        await new Promise((resolve) => setTimeout(resolve, SLOW_DELAY));
      }
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

    // Cosmetic progress animation while the real request is in flight.
    // Caps at 90% so the bar finishes only once the upload resolves.
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const nextProgress = Math.min(prev + 10, 90);
        const stepIndex = Math.min(Math.floor(nextProgress / 20), steps.length - 1);
        setProcessingStep(steps[stepIndex]);
        return nextProgress;
      });
    }, 400);

    try {
      const uploaded = await apiUpload<UploadResponse>("/api/files/upload", file);
      setUploadProgress(100);
      setProcessingStep(
        uploaded.status === "processing"
          ? "File saved. Indexing continues in the background..."
          : "File uploaded and indexed."
      );
      await loadFiles();
      if (uploaded.status === "processing") {
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
    // Optimistic removal.
    setFiles(prevFiles => prevFiles.filter(f => f.id !== id));
    try {
      await apiSend("/api/files/" + id, "DELETE");
    } catch (err) {
      // Restore on failure.
      setFiles(prev);
      setError(err instanceof Error ? err.message : "Could not delete file");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("filesTitle")}</h2>
        <p className="mt-1 text-sm text-muted-fg">{t("filesSub")}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
          dragActive
            ? "border-primary bg-primary/5 scale-[0.99]"
            : "border-border bg-card hover:border-border"
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
            <div className="flex items-center justify-between text-xs text-muted-fg">
              <span className="font-semibold text-primary">{processingStep}</span>
              <span className="font-mono">{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-background">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-fg animate-pulse">
              The file is saved first; indexing can finish in the background.
            </p>
          </div>
        ) : (
          <label htmlFor="file-upload" className="cursor-pointer group flex flex-col items-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-foreground">
              {t("dropzoneTitle")}
            </h3>
            <p className="mt-1 text-xs text-muted-fg">
              {t("dropzoneSub")}
            </p>
          </label>
        )}
      </div>

      {/* Parsed Documents List */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div>
          <h3 className="text-base font-bold text-foreground">{t("fileListTitle")}</h3>
          <p className="text-xs text-muted-fg mt-0.5">{t("fileListSub")}</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-fg">
            <Database className="h-8 w-8 mb-2 animate-pulse" />
            <p className="text-sm">Loading knowledge bases...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-fg">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p className="text-sm">No knowledge bases ingested yet. Upload files to get started.</p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm text-muted-fg">
              <thead className="border-b border-border bg-background text-xs font-semibold uppercase text-muted-fg">
                <tr>
                  <th scope="col" className="px-4 py-3">{t("fileName")}</th>
                  <th scope="col" className="px-4 py-3">{t("fileSize")}</th>
                  <th scope="col" className="px-4 py-3">{t("chunksCreated")}</th>
                  <th scope="col" className="px-4 py-3">{t("uploadDate")}</th>
                  <th scope="col" className="px-4 py-3">{t("status")}</th>
                  <th scope="col" className="px-4 py-3 text-center">{t("action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-4 flex items-center gap-3 font-medium text-foreground">
                      {/\.xlsx?$/i.test(file.name) ? (
                        <FileSpreadsheet className="h-4 w-4 text-success shrink-0" />
                      ) : (
                        <File className="h-4 w-4 text-primary shrink-0" />
                      )}
                      <span className="truncate max-w-xs">{file.name}</span>
                    </td>
                    <td className="px-4 py-4">{file.size}</td>
                    <td className="px-4 py-4 font-mono font-semibold text-primary">{file.chunks}</td>
                    <td className="px-4 py-4 text-muted-fg">{file.date}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                          file.status === "failed"
                            ? "bg-danger/10 text-danger ring-danger/20"
                            : file.status === "processing"
                            ? "bg-warning/10 text-warning ring-warning/20"
                            : "bg-success/10 text-success ring-success/20"
                        }`}
                      >
                        {file.status === "failed"
                          ? t("failed")
                          : file.status === "processing"
                          ? t("processing")
                          : t("completed")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="rounded-lg p-1.5 text-muted-fg hover:bg-danger/10 hover:text-danger transition-colors"
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
