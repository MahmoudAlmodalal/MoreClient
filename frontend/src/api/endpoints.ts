// Typed wrappers around each backend endpoint.
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from "./client";
import type {
  AnalyticsResponse,
  FileOut,
  HandoffOut,
  OkResponse,
  SettingsOut,
  SettingsUpdate,
  UploadResponse,
} from "../types/api";

export const getAnalytics = () => apiGet<AnalyticsResponse>("/analytics");

export const getFiles = () => apiGet<FileOut[]>("/files");
export const uploadFile = (file: File) => apiUpload<UploadResponse>("/upload", file);
export const deleteFile = (id: number) => apiDelete<OkResponse>(`/files/${id}`);

export const getHandoffs = (channel?: string) =>
  apiGet<HandoffOut[]>(
    channel ? `/handoffs?channel=${encodeURIComponent(channel)}` : "/handoffs",
  );
export const replyHandoff = (id: number, content: string) =>
  apiPost<HandoffOut>(`/handoffs/${id}/reply`, { content });
export const resolveHandoff = (id: number) =>
  apiPost<OkResponse>(`/handoffs/${id}/resolve`);

export const getSettings = () => apiGet<SettingsOut>("/settings");
export const updateSettings = (patch: SettingsUpdate) =>
  apiPut<SettingsOut>("/settings", patch);
