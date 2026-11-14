/**
 * Photo renders API (backend routes/render.routes.ts).
 */
import { requestApi } from "@/lib/api/http";
import type { RenderQuality, RenderSpec } from "@/lib/render/sceneSpec";

export type RenderStatus = "uploading" | "queued" | "running" | "done" | "failed" | "cancelled";

export interface PhotoRender {
  id: string;
  projectId: string;
  kind: "image" | "panorama" | "video";
  quality: RenderQuality;
  status: RenderStatus;
  width: number | null;
  height: number | null;
  url: string | null;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export const createRender = (body: {
  projectId: string; quality: RenderQuality; spec: RenderSpec; sceneHash: string; sceneBytes: number;
}) => requestApi<{ job: PhotoRender; upload: { url: string } | null }>({ path: "/renders", method: "POST", body });

export const startRender = (id: string) =>
  requestApi<{ job: PhotoRender }>({ path: `/renders/${encodeURIComponent(id)}/start`, method: "POST" });

export const getRender = (id: string) =>
  requestApi<{ job: PhotoRender }>({ path: `/renders/${encodeURIComponent(id)}`, method: "GET" });

export const listRenders = (projectId: string) =>
  requestApi<{ items: PhotoRender[]; available: boolean }>({ path: `/renders?projectId=${encodeURIComponent(projectId)}`, method: "GET" });
