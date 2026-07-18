// ─── Walkthrough Video Recorder ───────────────────────────────────────────────
// Captures the R3F canvas stream using the HTML5 MediaRecorder API.
// Returns a { recorder, chunks } pair so the caller can stop/download later.

export interface RecordingSession {
  recorder: MediaRecorder;
  chunks: Blob[];
}

/** Start recording the WebGL canvas at 30 FPS. Returns the active session. */
export function startCanvasRecording(canvas: HTMLCanvasElement): RecordingSession {
  const stream = canvas.captureStream(30);

  const mimeType =
    MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "";

  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  // Request a chunk every 100 ms so we accumulate data continuously
  recorder.start(100);

  return { recorder, chunks };
}

/** Stop the recorder and trigger a browser download of the recorded .webm file. */
export function stopAndDownload(
  session: RecordingSession,
  filename = "nooi-walkthrough.webm",
): Promise<void> {
  return new Promise<void>((resolve) => {
    session.recorder.onstop = () => {
      const blob = new Blob(session.chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Revoke object URL after a short delay to let the download start
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      resolve();
    };
    session.recorder.stop();
  });
}
