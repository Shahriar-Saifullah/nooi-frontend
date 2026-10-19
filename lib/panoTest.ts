/**
 * Panorama seam test — lib/panoTest.ts
 * ============================================================================
 * A throwaway experiment, not a feature. It answers one question before anyone
 * spends a week on panoramas:
 *
 *   If two adjacent 90° views of the same room are rendered separately, do the
 *   walls still match where they meet?
 *
 * Diffusion models have no memory between calls. Same wall, same prompt, two
 * requests — one can come back warm beige and the other cool grey. Across a
 * panorama that shows up as a visible colour jump every 90°, which would sink
 * the whole approach. Better to find that out in an hour.
 *
 * What it does: points the camera north, captures colour + depth, rotates 90°
 * east, captures again — WITH A DELIBERATE OVERLAP so the same strip of wall
 * appears in both. Then downloads four files to run through the render
 * endpoint by hand.
 *
 * Usage, from the browser console on the canvas page in 3D mode:
 *
 *     __nooiPanoTest()
 *
 * Wire it up in app/canvas/page.tsx, inside the component:
 *
 *     useEffect(() => {
 *       (window as any).__nooiPanoTest = () =>
 *         capturePanoPair(sceneRef.current, cameraRef);
 *       return () => { delete (window as any).__nooiPanoTest; };
 *     }, []);
 *
 * It needs the camera, which the scene handle does not expose. Simplest is to
 * add this to ThreeSceneHandle and return it from the useImperativeHandle
 * block in ThreeSceneV2:
 *
 *     getCamera: () => THREE.Camera | null;
 *     // inside ExportBridge's register({ ... }):
 *     getCamera: () => camera,
 */

import type * as THREE from "three";

interface PanoCaptureHandle {
  captureImage: () => string | null;
  captureDepthMap: () => string | null;
  getCamera?: () => THREE.Camera | null;
}

/** 90° per face. The overlap below is extra on top of this. */
const FACE_FOV = 90;
/**
 * Degrees of overlap between adjacent faces.
 *
 * Without an overlap there is nothing to blend and any colour difference
 * becomes a hard line. 12° gives a strip wide enough to cross-fade and narrow
 * enough not to waste resolution. It is also what makes this test meaningful:
 * the SAME wall appears in both images, so a mismatch is unambiguous rather
 * than a judgement call about two different walls.
 */
const OVERLAP_DEG = 12;

function download(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Wait for the renderer to actually draw at the new orientation. */
const nextFrames = (n: number) =>
  new Promise<void>((resolve) => {
    let left = n;
    const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  });

/**
 * Capture two adjacent faces and their depth maps, then restore the camera.
 *
 * Returns nothing useful — the point is the four downloaded files.
 */
export async function capturePanoPair(
  handle: PanoCaptureHandle | null,
  opts: { yawStartDeg?: number } = {},
): Promise<void> {
  if (!handle?.getCamera) {
    console.error(
      "[pano] no camera. Add getCamera to ThreeSceneHandle — see the comment " +
      "at the top of lib/panoTest.ts.",
    );
    return;
  }

  const camera = handle.getCamera() as THREE.PerspectiveCamera | null;
  if (!camera) { console.error("[pano] camera not ready"); return; }

  // Remember everything we are about to change.
  const prevQuat = camera.quaternion.clone();
  const prevFov = camera.fov;
  const prevUp = camera.up.clone();

  const yaw0 = opts.yawStartDeg ?? 0;

  try {
    // A wider lens than the face itself, so adjacent captures share a strip.
    camera.fov = FACE_FOV + OVERLAP_DEG;
    camera.updateProjectionMatrix();

    for (let i = 0; i < 2; i++) {
      const yaw = ((yaw0 + i * FACE_FOV) * Math.PI) / 180;

      // Level horizon. A panorama with a tilted horizon reads as broken even
      // when every face is individually fine, and the canvas camera is almost
      // never perfectly level after a user has been orbiting.
      camera.up.set(0, 1, 0);
      camera.rotation.set(0, yaw, 0, "YXZ");
      camera.updateMatrixWorld(true);

      // Two frames: one for the matrix to land, one for the draw.
      await nextFrames(2);

      const colour = handle.captureImage();
      const depth = handle.captureDepthMap();

      if (!colour) { console.error(`[pano] face ${i}: colour capture failed`); return; }
      download(colour, `pano-face${i}-colour.png`);
      if (depth) download(depth, `pano-face${i}-depth.png`);
      else console.warn(`[pano] face ${i}: no depth map — check the console for the contrast warning`);

      await nextFrames(1);   // let the downloads fire before moving on
    }

    console.info(
      "[pano] captured 2 faces with a %d° overlap.\n" +
      "Run BOTH colour images through /projects/:id/render-scene (same prompt, " +
      "same seed) and compare the overlapping strip: face 0's right edge is " +
      "the same wall as face 1's left edge.\n" +
      "Matching tone → panoramas are viable. A visible jump → they are not, " +
      "at least not without a seam-aware model.",
      OVERLAP_DEG,
    );
  } finally {
    // Always put the camera back, even if a capture threw. Leaving the user
    // staring at a wall with no idea why is a worse bug than the test failing.
    camera.fov = prevFov;
    camera.up.copy(prevUp);
    camera.quaternion.copy(prevQuat);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }
}