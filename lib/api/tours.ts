/**
 * 360° tours API (backend routes/tour.routes.ts).
 */
import { requestApi } from "@/lib/api/http";
import type { RenderQuality } from "@/lib/render/sceneSpec";
import type { TourNodeOut, TourPlanOut } from "@/lib/tour/graph";

export type TourStatus = "uploading" | "rendering" | "done" | "partial" | "failed" | "cancelled";

export interface TourNodeView extends TourNodeOut {
  status: "uploading" | "queued" | "running" | "done" | "failed" | "cancelled";
  url: string | null;
}

export interface Tour {
  id: string;
  title: string;
  status: TourStatus;
  quality: RenderQuality;
  createdAt: string;
  progress: { done: number; total: number };
  nodes: TourNodeView[];
  plan: TourPlanOut;
  projectId?: string;
  shared?: boolean;
  shareToken?: string | null;
}

export interface TourSummary {
  id: string; title: string; status: TourStatus; quality: RenderQuality; createdAt: string; rooms: number; shared: boolean;
}

export const createTour = (body: {
  projectId: string; quality: RenderQuality; sceneHash: string; sceneBytes: number;
  lights: { sun: unknown; lamps: unknown; environment: number };
  nodes: TourNodeOut[]; plan: TourPlanOut; title?: string;
}) => requestApi<{ tour: Tour; upload: { url: string } | null }>({ path: "/tours", method: "POST", body });

export const startTour = (id: string) =>
  requestApi<{ tour: Tour }>({ path: `/tours/${encodeURIComponent(id)}/start`, method: "POST" });

export const getTour = (id: string) =>
  requestApi<{ tour: Tour }>({ path: `/tours/${encodeURIComponent(id)}`, method: "GET" });

export const listTours = (projectId: string) =>
  requestApi<{ items: TourSummary[]; available: boolean }>({ path: `/tours?projectId=${encodeURIComponent(projectId)}`, method: "GET" });

export const shareTour = (id: string, on: boolean) =>
  requestApi<{ tour: Tour }>({ path: `/tours/${encodeURIComponent(id)}/share`, method: "POST", body: { on } });

export const getSharedTour = (token: string) =>
  requestApi<{ tour: Tour }>({ path: `/tours/shared/${encodeURIComponent(token)}`, method: "GET" });

export const tourShareUrl = (token: string) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/share/tour/${token}`;
