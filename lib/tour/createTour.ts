/**
 * Making a 360° tour, browser side: lay out the rooms, export the scene,
 * upload it (skipped when this exact scene is already stored), start.
 */
import { createTour, startTour, type Tour } from "@/lib/api/tours";
import { gzip, sha256Hex } from "@/lib/render/photoRender";
import type { RenderQuality, RenderSpec } from "@/lib/render/sceneSpec";
import type { buildTour } from "@/lib/tour/graph";

export type TourStage = "preparing" | "uploading" | "starting";

const errorText = (e: unknown, fallback: string) =>
  typeof e === "string" ? e : e instanceof Error ? e.message : fallback;

export async function requestTour(opts: {
  projectId: string;
  quality: RenderQuality;
  title?: string;
  layout: ReturnType<typeof buildTour>;
  exportGlb: () => Promise<Blob | null>;
  /** any photo-render spec of the scene: only its lights are used */
  lights: RenderSpec;
  onStage?: (s: TourStage) => void;
}): Promise<Tour> {
  if (!opts.layout.nodes.length) throw new Error("There are no rooms to tour.");
  opts.onStage?.("preparing");
  const glb = await opts.exportGlb();
  if (!glb) throw new Error("Could not prepare the scene.");
  const raw = await glb.arrayBuffer();
  const created = await createTour({
    projectId: opts.projectId,
    quality: opts.quality,
    title: opts.title,
    sceneHash: await sha256Hex(raw),
    sceneBytes: raw.byteLength,
    lights: { sun: opts.lights.sun, lamps: opts.lights.lamps, environment: opts.lights.environment },
    nodes: opts.layout.nodes,
    plan: opts.layout.plan,
  });
  if (!created.success) throw new Error(errorText(created.error, "Could not start the tour."));
  if (created.data.upload) {
    opts.onStage?.("uploading");
    const res = await fetch(created.data.upload.url, {
      method: "PUT",
      headers: { "Content-Type": "application/gzip", "x-upsert": "true" },
      body: await gzip(raw),
    });
    if (!res.ok) throw new Error("The scene upload failed. Please try again.");
  }
  opts.onStage?.("starting");
  const started = await startTour(created.data.tour.id);
  if (!started.success) throw new Error(errorText(started.error, "Could not start the tour."));
  return started.data.tour;
}
