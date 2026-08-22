#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Render product-style thumbnails for every .glb in the model library
#
# Why not generate these in the browser? Two reasons:
#  1. Converted assets use Draco/meshopt compression, which the runtime
#     thumbnail loader can't decode — those items fall back to a grey box.
#  2. Runtime previews mean downloading multi-MB models just to draw a 100px
#     card, with lighting and framing that vary per model.
#
# Pre-rendering gives consistent three-point lighting, consistent framing, and
# a ~20KB WebP per item. This is how furniture retailers do it.
#
# ── Usage ────────────────────────────────────────────────────────────────────
#   ./render-thumbs.sh [models-dir] [output-dir] [size]
#   ./render-thumbs.sh public/models public/models/thumbs 512
#
# Output filenames match the .glb basename, so a model at
#   public/models/decor/vase_ceramic.glb
# becomes
#   public/models/thumbs/vase_ceramic.webp
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

MODELS="${1:-public/models}"
OUT="${2:-public/models/thumbs}"
SIZE="${3:-512}"

mkdir -p "$OUT"
TMP="$(mktemp -d)"

cat > "$TMP/thumbs.py" <<'PY'
import bpy, sys, os, math, glob
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
models_dir, out_dir, size = argv[0], argv[1], int(argv[2])

files = sorted(glob.glob(os.path.join(models_dir, "**", "*.glb"), recursive=True))
print(f"[thumbs] found {len(files)} models")

def setup_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene

    engines = [i.identifier for i in
               bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines \
                          else "BLENDER_EEVEE"
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.render.film_transparent = True          # works on light or dark cards
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.quality = 90
    scene.render.image_settings.color_mode = "RGBA"

    # soft ambient so nothing is pitch black
    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (1, 1, 1, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.55
    scene.world = world

    # three-point-ish lighting: key, fill, rim
    def add_light(name, kind, energy, loc, rot, size_=5.0):
        d = bpy.data.lights.new(name, type=kind)
        d.energy = energy
        if kind == "AREA":
            d.size = size_
        o = bpy.data.objects.new(name, d)
        o.location = loc
        o.rotation_euler = rot
        scene.collection.objects.link(o)
        return o

    add_light("key",  "AREA", 400, (3, -3, 4), (math.radians(50), 0, math.radians(45)), 6)
    add_light("fill", "AREA", 120, (-3, -2, 2), (math.radians(70), 0, math.radians(-50)), 6)
    add_light("rim",  "AREA", 180, (0, 3.5, 3), (math.radians(120), 0, 0), 5)

    cam_d = bpy.data.cameras.new("cam")
    cam_d.lens = 60                                # mild telephoto: less distortion
    cam = bpy.data.objects.new("cam", cam_d)
    scene.collection.objects.link(cam)
    scene.camera = cam
    return scene, cam

def bounds(objs):
    lo = Vector((math.inf,)*3); hi = Vector((-math.inf,)*3)
    for o in objs:
        if o.type != "MESH":
            continue
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            for i in range(3):
                lo[i] = min(lo[i], w[i]); hi[i] = max(hi[i], w[i])
    return lo, hi

done = skipped = 0
for path in files:
    name = os.path.splitext(os.path.basename(path))[0]
    dest = os.path.join(out_dir, f"{name}.webp")

    scene, cam = setup_scene()
    try:
        bpy.ops.import_scene.gltf(filepath=path)   # handles Draco natively
    except Exception as e:
        print(f"[thumbs] SKIP {name}: {e}")
        skipped += 1
        continue

    meshes = [o for o in scene.objects if o.type == "MESH"]
    if not meshes:
        print(f"[thumbs] SKIP {name}: no meshes")
        skipped += 1
        continue

    lo, hi = bounds(meshes)
    centre = (lo + hi) / 2
    radius = max((hi - lo).length / 2, 1e-3)

    # 3/4 view from slightly above — reads better than a flat elevation
    direction = Vector((1.0, -1.35, 0.72)).normalized()
    cam.location = centre + direction * (radius * 2.9)
    cam.rotation_euler = (centre - cam.location).to_track_quat("-Z", "Y").to_euler()

    scene.render.filepath = dest
    bpy.ops.render.render(write_still=True)
    print(f"[thumbs] {name}.webp")
    done += 1

print(f"[thumbs] rendered {done}, skipped {skipped}")
PY

blender --background --factory-startup --python "$TMP/thumbs.py" -- \
        "$MODELS" "$OUT" "$SIZE"
rm -rf "$TMP"

echo
echo "✅ Thumbnails in $OUT"
du -sh "$OUT" 2>/dev/null || true
echo
echo "The library picks these up automatically: a model at models/<any>/foo.glb"
echo "uses models/thumbs/foo.webp if it exists, else falls back to runtime render."