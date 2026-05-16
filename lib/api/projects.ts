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

export interface Room {
  id: string;
  name: string;
  color?: string;
  confidence?: number;
  length?: number;
  width?: number;
  height?: number;
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
    body: JSON.stringify({ 
      name, 
      project_type: projectType.toLowerCase(), 
      address 
    }),
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
