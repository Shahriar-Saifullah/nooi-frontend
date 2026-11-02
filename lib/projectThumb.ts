/**
 * The project picture, handed from the canvas to the marketplace —
 * lib/projectThumb.ts
 * ============================================================================
 * The canvas saves the picture to the server too, but "Shop this room" opens
 * before that upload is guaranteed to land. The fresh capture rides along in
 * sessionStorage so the marketplace can show it at once; after a refresh or
 * from a link, the saved thumbnail_url takes over. Storage can be missing or
 * full (private windows), so every access is guarded and failure is silent.
 */

const KEY = (projectId: string) => `nooi:project-thumb:${projectId}`;
const FRESH_FOR_MS = 30 * 60 * 1000;

export function rememberProjectThumb(projectId: string, dataUrl: string) {
  try {
    sessionStorage.setItem(KEY(projectId), JSON.stringify({ at: Date.now(), url: dataUrl }));
  } catch { /* storage full or blocked — the saved copy will do */ }
}

export function recentProjectThumb(projectId: string): string | null {
  try {
    const raw = sessionStorage.getItem(KEY(projectId));
    if (!raw) return null;
    const { at, url } = JSON.parse(raw) as { at: number; url: string };
    return Date.now() - at < FRESH_FOR_MS && typeof url === "string" ? url : null;
  } catch { return null; }
}
