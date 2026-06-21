const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ─── Public landing-page preview generation ───────────────────────────────────
// No auth header needed — this hits a public, rate-limited endpoint since the
// visitor may not have an account yet. See backend/src/routes/ai.routes.ts.

export async function generatePreview(prompt: string, file?: File | null) {
  const formData = new FormData();
  formData.append('prompt', prompt);
  if (file) formData.append('floor_plan', file);

  const res = await fetch(`${BASE_URL}/ai/generate-preview`, {
    method: 'POST',
    body: formData,
  });

  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to generate preview");
  return json.data as { image_url: string };
}