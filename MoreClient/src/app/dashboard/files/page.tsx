"use client";

import React, { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import {
  UploadCloud,
  File,
  Trash2,
  AlertCircle,
  Database,
  Sparkles
} from "lucide-react";

interface IngestedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  chunks: number;
  date: string;
  status: "Completed" | "Processing" | "Failed";
}

export default function FilesPage() {
  const { t } = useLanguage();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const [files, setFiles] = useState<IngestedFile[]>([
    {
      id: "1",
      name: "clientmore_company_faq_2026.pdf",
      size: "2.4 MB",
      type: "pdf",
      chunks: 48,
      date: "2026-05-18",
      status: "Completed"
    },
    {
      id: "2",
      name: "product_shipping_guidelines.docx",
      size: "1.1 MB",
      type: "docx",
      chunks: 22,
      date: "2026-05-20",
      status: "Completed"
    },
    {
      id: "3",
      name: "returns_policy_v2.txt",
      size: "340 KB",
      type: "txt",
      chunks: 12,
      date: "2026-05-22",
      status: "Completed"
    }
  ]);

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
      simulateFileUpload(e.dataTransfer.files[0].name, e.dataTransfer.files[0].size);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      simulateFileUpload(e.target.files[0].name, e.target.files[0].size);
    }
  };

  const simulateFileUpload = (fileName: string, sizeBytes: number) => {
    setUploading(true);
    setUploadProgress(0);
    
    const steps = [
      "Reading file contents...",
      "Converting to clean Markdown format...",
      "Splitting document into 500-character chunks...",
      "Generating text-embedding-3-small vectors...",
      "Persisting 32 vectors inside local ChromaDB vector store..."
    ];

    setProcessingStep(steps[0]);

    // Animate progress bar
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const sizeString = sizeBytes > 1024 * 1024
              ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
              : `${(sizeBytes / 1024).toFixed(0)} KB`;

            const newFile: IngestedFile = {
              id: Date.now().toString(),
              name: fileName,
              size: sizeString,
              type: fileName.split(".").pop() || "txt",
              chunks: Math.floor(Math.random() * 25) + 5,
              date: new Date().toISOString().split("T")[0],
              status: "Completed"
            };

            setFiles(prevFiles => [newFile, ...prevFiles]);
            setUploading(false);
          }, 600);
          return 100;
        }

        const nextProgress = prev + 10;
        
        // Progressively update text stages
        const stepIndex = Math.min(Math.floor(nextProgress / 20), steps.length - 1);
        setProcessingStep(steps[stepIndex]);

        return nextProgress;
      });
    }, 400);
  };

  const handleDeleteFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">{t("filesTitle")}</h2>
        <p className="mt-1 text-sm text-gray-400">{t("filesSub")}</p>
      </div>

      {/* RAG Pipeline visual info banner */}
      <div className="rounded-xl border border-purple-500/10 bg-[#0d0d15] p-5 flex flex-col md:flex-row items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
          <Database className="h-5 w-5" />
        </div>
        <div className="flex-1 text-sm text-gray-300">
          <span className="font-bold text-white">Demo Vector Pipeline: </span>
          Uploaded docs are parsed into markdown text, split into chunks, and converted into local demo vectors for the frontend preview.
        </div>
        <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold bg-purple-500/5 px-3 py-1.5 rounded-lg border border-purple-500/10">
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
            ? "border-purple-500 bg-purple-500/5 scale-[0.99]"
            : "border-[#1f1f2e] bg-[#0d0d15] hover:border-[#2e2e42]"
        }`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".pdf,.docx,.txt"
          onChange={handleFileInput}
          disabled={uploading}
        />
        
        {uploading ? (
          <div className="w-full max-w-md space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold text-purple-400">{processingStep}</span>
              <span className="font-mono">{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#07070b]">
              <div
                className="h-full bg-purple-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500 animate-pulse">
              Generating semantic chunks in the local demo index...
            </p>
          </div>
        ) : (
          <label htmlFor="file-upload" className="cursor-pointer group flex flex-col items-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-white">
              {t("dropzoneTitle")}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {t("dropzoneSub")}
            </p>
          </label>
        )}
      </div>

      {/* Parsed Documents List */}
      <div className="rounded-xl border border-[#1f1f2e] bg-[#0d0d15] p-6">
        <div>
          <h3 className="text-base font-bold text-white">{t("fileListTitle")}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{t("fileListSub")}</p>
        </div>

        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p className="text-sm">No knowledge bases ingested yet. Upload files to get started.</p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="border-b border-[#1f1f2e] bg-[#07070b] text-xs font-semibold uppercase text-gray-400">
                <tr>
                  <th scope="col" className="px-4 py-3">{t("fileName")}</th>
                  <th scope="col" className="px-4 py-3">{t("fileSize")}</th>
                  <th scope="col" className="px-4 py-3">{t("chunksCreated")}</th>
                  <th scope="col" className="px-4 py-3">{t("uploadDate")}</th>
                  <th scope="col" className="px-4 py-3">{t("status")}</th>
                  <th scope="col" className="px-4 py-3 text-center">{t("action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f2e]">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-[#1a1a26]/20 transition-colors">
                    <td className="px-4 py-4 flex items-center gap-3 font-medium text-white">
                      <File className="h-4 w-4 text-purple-400 shrink-0" />
                      <span className="truncate max-w-xs">{file.name}</span>
                    </td>
                    <td className="px-4 py-4">{file.size}</td>
                    <td className="px-4 py-4 font-mono font-semibold text-purple-400">{file.chunks}</td>
                    <td className="px-4 py-4 text-gray-500">{file.date}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                        {t("completed")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
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
