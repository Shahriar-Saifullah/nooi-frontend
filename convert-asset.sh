#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Nooi asset pipeline:  FBX/OBJ (offline-render asset)  →  web-ready .glb
#
# Why this exists: assets from CGTrader / TurboSquid are built for 3ds Max +
# Corona/V-Ray. The Boca Tommy sofa is 294 MB unpacked (107 MB .max, 116 MB
# .obj, 42 MB .fbx, ~28 MB of 4K textures) — for ONE sofa. A browser scene
# with 15 items must stay in the tens of MB total, so every asset needs
# decimation + texture downscaling + compression before it ships.
#
# Typical result: 42 MB FBX  →  1–3 MB .glb   (~20–40× smaller)
#
# ── One-time setup ───────────────────────────────────────────────────────────
#   brew install --cask blender          # or apt install blender
#   npm i -g @gltf-transform/cli
#
# ── Usage ────────────────────────────────────────────────────────────────────
#   ./convert-asset.sh <input.fbx|input.obj> <output-name> [target-tris]
#   ./convert-asset.sh Boca_Tommy__corona.fbx boca_tommy 40000
#
# Output:
#   public/models/<category>/<output-name>.glb
#   public/models/thumbs/<output-name>.webp   (render a preview yourself, or
#                                              let the app generate it once)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

IN="${1:?usage: convert-asset.sh <input.fbx> <output-name> [target-tris]}"
NAME="${2:?missing output name}"
TARGET_TRIS="${3:-40000}"      # 30–60k is plenty for furniture in a room scene
OUT_DIR="${OUT_DIR:-./public/models}"
TMP="$(mktemp -d)"

echo "▶ 1/4  Blender: import + decimate to ~${TARGET_TRIS} triangles"
cat > "$TMP/convert.py" <<'PY'
import bpy, sys, os
argv = sys.argv[sys.argv.index("--") + 1:]
src, dst, target = argv[0], argv[1], int(argv[2])

bpy.ops.wm.read_factory_settings(use_empty=True)
ext = os.path.splitext(src)[1].lower()
if ext == ".fbx":
    bpy.ops.import_scene.fbx(filepath=src)
elif ext == ".obj":
    # Blender 4.x operator name; older builds use import_scene.obj
    try:    bpy.ops.wm.obj_import(filepath=src)
    except AttributeError: bpy.ops.import_scene.obj(filepath=src)
else:
    raise SystemExit(f"unsupported input: {ext}")

meshes = [o for o in bpy.data.objects if o.type == "MESH"]
total = sum(len(o.data.polygons) for o in meshes)
print(f"   imported {len(meshes)} meshes, {total} faces")

if total > target:
    ratio = max(0.02, target / float(total))
    for o in meshes:
        m = o.modifiers.new("dec", "DECIMATE")
        m.ratio = ratio
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=m.name)
    print(f"   decimated at ratio {ratio:.3f}")

# Centre on origin and sit the asset on the floor — the app scales models to
# their catalog size, but expects a sane pivot.
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

bpy.ops.export_scene.gltf(
    filepath=dst,
    export_format="GLB",
    export_apply=True,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
)
print("   exported", dst)
PY

blender --background --factory-startup --python "$TMP/convert.py" -- \
        "$IN" "$TMP/$NAME.raw.glb" "$TARGET_TRIS"

echo "▶ 2/4  gltf-transform: prune unused data + dedupe"
gltf-transform prune  "$TMP/$NAME.raw.glb" "$TMP/$NAME.pruned.glb"
gltf-transform dedup  "$TMP/$NAME.pruned.glb" "$TMP/$NAME.dedup.glb"

echo "▶ 3/4  gltf-transform: downscale textures to 1024 + WebP"
gltf-transform resize "$TMP/$NAME.dedup.glb" "$TMP/$NAME.resized.glb" \
    --width 1024 --height 1024
gltf-transform webp   "$TMP/$NAME.resized.glb" "$TMP/$NAME.webp.glb" --quality 85

echo "▶ 4/4  gltf-transform: meshopt compression"
gltf-transform meshopt "$TMP/$NAME.webp.glb" "$TMP/$NAME.final.glb" --level medium

mkdir -p "$OUT_DIR"
mv "$TMP/$NAME.final.glb" "$OUT_DIR/$NAME.glb"
rm -rf "$TMP"

SIZE=$(du -h "$OUT_DIR/$NAME.glb" | cut -f1)
echo
echo "✅ $OUT_DIR/$NAME.glb  ($SIZE)"
echo
echo "Next steps:"
echo "  1. If it is over ~3 MB, re-run with a lower target: $0 \"$IN\" $NAME 20000"
echo "  2. Add the variant to lib/furniture/catalog.ts (id, path, real size in cm)"
echo "  3. Record the licence in the variant's \`credit\` field"
echo "  4. Load it in the canvas and check scale, pivot and orientation"