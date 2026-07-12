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