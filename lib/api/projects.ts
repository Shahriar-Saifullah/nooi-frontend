import { createClient } from "@/utils/supabase/client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type ProjectType =
  | 'residential'
  | 'commercial'
  | 'hospitality'
  | 'healthcare'
  | 'education'
  | 'industrial';

export type ProjectStatus = 'draft' | 'active' | 'published';

export interface RoomBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Room {
  id: string;
  name: string;
  color?: string;
  confidence?: number;
  length?: number;
  width?: number;
  height?: number;
  box?: RoomBox;
  polygon?: [number, number][];        // ← add this
  px_size?: { w: number; h: number };
  gridRow?: number;
  gridCol?: number;
  rowWeight?: number;
  colWeight?: number;
}

export interface Project {
  id: string;
  name: string;
  project_type: ProjectType;
  address: string | null;
  status: ProjectStatus;
  thumbnail_url: string | null;
  floor_plan_url: string | null;
  floor_plan_data: Record<string, unknown>;
  room_data: {
    rooms: Room[];
    total_area_m2?: number;
    building_perimeter?: [number, number][];
    walls?: Array<{ x1: number; y1: number; x2: number; y2: number; thickness: number }>;
    openings?: Array<{
      type: 'door' | 'window';
      wall: 'horizontal' | 'vertical';
      x: number;
      y: number;
      width: number;
    }>;
  };
  created_at: string;
  updated_at: string;
  share_token?: string | null;
  share_enabled?: boolean;
}

async function getAuthHeaders(headers: Record<string, string> = {}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function createProject(name: string, projectType: string, address?: string) {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ name, project_type: projectType.toLowerCase(), address }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to create project");
  return json.data.project as Project;
}

export async function uploadFloorPlan(projectId: string, file: File) {
  const formData = new FormData();
  formData.append('floor_plan', file);
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/projects/${projectId}/floor-plan`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to upload floor plan");
  return json.data;
}

export async function saveRooms(projectId: string, rooms: Room[]) {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(`${BASE_URL}/projects/${projectId}/rooms`, {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: JSON.stringify({ project_id: projectId, rooms }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to save rooms");
  return json.data.rooms as Room[];
}

export async function saveDimensions(projectId: string, rooms: Room[]) {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(`${BASE_URL}/projects/${projectId}/dimensions`, {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: JSON.stringify({ project_id: projectId, rooms }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to save dimensions");
  return json.data as { rooms: Room[]; total_area_m2: number };
}

export async function listProjects(limit?: number) {
  const headers = await getAuthHeaders();
  const url = limit ? `${BASE_URL}/projects?limit=${limit}` : `${BASE_URL}/projects`;
  const res = await fetch(url, { method: 'GET', credentials: 'include', headers });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to load projects");
  return json.data.projects as Project[];
}

export async function getProject(projectId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/projects/${projectId}`, {
    method: 'GET',
    credentials: 'include',
    headers,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to load project");
  return json.data.project as Project;
}

// ─── AI image generation ───────────────────────────────────────────────────
// All 5 model options currently route to Gemini on the backend.
// The labels are UI-only — the backend ignores the model field for now.

export type AiModel = 'gemini' | 'dalle' | 'midjourney' | 'flux' | 'stable-diffusion';

export const AI_MODEL_OPTIONS: { value: AiModel; label: string }[] = [
  { value: 'gemini',           label: 'Gemini' },
  { value: 'dalle',            label: 'DALL-E' },
  { value: 'midjourney',       label: 'Midjourney' },
  { value: 'flux',             label: 'Flux' },
  { value: 'stable-diffusion', label: 'Stable Diffusion' },
];

export async function generateRender(projectId: string, prompt: string, model: AiModel) {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(`${BASE_URL}/projects/${projectId}/generate-render`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ prompt, model }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to generate render");
  return json.data as { image_url: string; model_requested: AiModel };
}

// ── ADD to lib/api/projects.ts ────────────────────────────────────────────────

// Placed furniture item (mirrors PlacedFurniture in ThreeSceneV2)
export interface FurniturePlacement {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: number;
  modelId?: string;
  sizeScale?: number;
  color?: string | null;
  materialPreset?: string | null;
  scale?: [number, number, number];
  width?: number;
  depth?: number;
  height?: number;
}

export async function saveFurniture(
  projectId: string,
  furniture: FurniturePlacement[],
  wallColors?: Record<string, string>,
) {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(`${BASE_URL}/projects/${projectId}/furniture`, {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      furniture,
      ...(wallColors !== undefined ? { wall_colors: wallColors } : {}),
    }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to save furniture");
  return json.data as { furniture: FurniturePlacement[] };
}

// ─── Sharing ─────────────────────────────────────────────────────────────────

export async function toggleShare(projectId: string, enabled: boolean) {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(`${BASE_URL}/projects/${projectId}/share`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ enabled }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to update sharing");
  return json.data as { share_enabled: boolean; share_token: string };
}

/** Public — no auth. Used by the /share/[token] viewer page. */
export async function getSharedProject(token: string) {
  const res = await fetch(`${BASE_URL}/shared/${encodeURIComponent(token)}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Not found");
  return json.data.project as Pick<Project, 'name' | 'project_type' | 'room_data' | 'updated_at'>;
}

// ─── AI furnish: natural-language furniture placement ────────────────────────

export interface AiFurnishPayload {
  command: string;
  rooms: {
    id: string; name: string;
    rect: { x: number; z: number; w: number; d: number };
    polygon?: [number, number][];   // world coords, when the room is polygonal
  }[];
  catalog: { id: string; name: string; category: string; w: number; d: number; h?: number }[];
  existing?: { name: string; x: number; z: number }[];
}

export interface AiFurnishResult {
  targetRoomId: string;
  targetRoomName: string;
  message: string;
  placements: { modelId: string; x: number; z: number; rotation: number }[];
}

export async function aiFurnish(projectId: string, payload: AiFurnishPayload) {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(`${BASE_URL}/projects/${projectId}/ai-furnish`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Couldn't place furniture");
  return json.data as AiFurnishResult;
}