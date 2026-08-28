#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Render catalog thumbnails for every .glb in the model library
#
# Deliberately simple: one camera, three lights, no backdrop or floor geometry.
# An earlier version added a gradient backdrop and a shadow-catching floor to
# make the shots prettier; both broke framing (GLB imports are parented to a
# rotation empty, so shifting meshes and adding scene geometry put the camera
# inside the backdrop). Clean and correct beats fancy and wrong.
#
# Note Blender's glTF importer reads Draco but NOT meshopt, which
# convert-asset.sh applies — so each model is round-tripped through
# gltf-transform first to decode it.
#
# ── Usage ────────────────────────────────────────────────────────────────────
#   ./render-thumbs.sh [models-dir] [output-dir] [size] [bg]
#   ./render-thumbs.sh public/models public/models/thumbs 512 transparent
#
# A model at models/<any>/foo.glb becomes models/thumbs/foo.webp, which the
# furniture library picks up by convention — no catalog edits needed.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

MODELS="${1:-public/models}"
OUT="${2:-public/models/thumbs}"
SIZE="${3:-512}"
BG="${4:-transparent}"        # transparent | white
FORCE="${FORCE:-0}"           # FORCE=1 re-renders models that already have one

# Incremental by default: only models without a thumbnail are rendered, so
# this is cheap to run after adding an asset (NOOI-23) rather than a full
# rebuild every time.

mkdir -p "$OUT"
TMP="$(mktemp -d)"

cat > "$TMP/thumbs.py" <<'PY'
import bpy, sys, os, math, glob, shutil
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
models_dir, out_dir, size = argv[0], argv[1], int(argv[2])
bg = argv[3] if len(argv) > 3 else "transparent"
force = (len(argv) > 4 and argv[4] == "1")

files = sorted(
    f for f in glob.glob(os.path.join(models_dir, "**", "*.glb"), recursive=True)
    if "_decoded" not in f
)
print(f"[thumbs] found {len(files)} models")

def setup_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene

    engines = [i.identifier for i in
               bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines \
                          else "BLENDER_EEVEE"
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.render.film_transparent = (bg == "transparent")
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.quality = 90
    scene.render.image_settings.color_mode = "RGBA"

    # Ambient fill. The first pass used 0.55 against a pure-white world, which
    # flattened every model into pale clay. Lower ambient plus a much stronger
    # key is what gives the shapes definition.
    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    bgn = world.node_tree.nodes["Background"]
    bgn.inputs[0].default_value = (0.96, 0.96, 0.98, 1)
    bgn.inputs[1].default_value = 0.30
    scene.world = world

    def add_light(name, energy, loc, rot, size_, colour):
        d = bpy.data.lights.new(name, type="AREA")
        d.energy = energy
        d.size = size_
        d.color = colour
        o = bpy.data.objects.new(name, d)
        o.location = loc
        o.rotation_euler = rot
        scene.collection.objects.link(o)

    # ~5:1 key-to-fill. Even lighting reads as flat; contrast reads as form.
    add_light("key",  900, (3.2, -3.4, 4.2),
              (math.radians(48), 0, math.radians(42)), 5, (1.00, 0.97, 0.92))
    add_light("fill", 180, (-3.6, -2.2, 1.8),
              (math.radians(74), 0, math.radians(-52)), 7, (0.92, 0.95, 1.00))
    add_light("rim",  320, (0.4, 3.6, 3.2),
              (math.radians(122), 0, 0), 4, (1.00, 1.00, 1.00))

    cam_d = bpy.data.cameras.new("cam")
    cam_d.lens = 60                       # mild telephoto: less distortion
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

def warm_untextured(meshes):
    """Imports with no texture arrive near-white and read as plaster. Give
    those a warm neutral so they look like furniture. Textured materials, and
    ones that already carry a real colour, are left alone."""
    for o in meshes:
        for slot in o.material_slots:
            m = slot.material
            if not m or not m.use_nodes:
                continue
            bsdf = m.node_tree.nodes.get("Principled BSDF")
            if not bsdf or bsdf.inputs["Base Color"].is_linked:
                continue
            c = bsdf.inputs["Base Color"].default_value
            if min(c[0], c[1], c[2]) > 0.78:
                bsdf.inputs["Base Color"].default_value = (0.72, 0.66, 0.58, 1)
                bsdf.inputs["Roughness"].default_value = 0.75

decoded_dir = os.path.join(out_dir, "_decoded")
os.makedirs(decoded_dir, exist_ok=True)

done = skipped = 0
for path in files:
    name = os.path.splitext(os.path.basename(path))[0]
    dest = os.path.join(out_dir, f"{name}.webp")

    # Skip models that already have a preview unless it is older than the
    # model itself — that way replacing a .glb regenerates its thumbnail.
    if not force and os.path.exists(dest):
        if os.path.getmtime(dest) >= os.path.getmtime(path):
            skipped += 1
            continue
        print(f"[thumbs] {name}: model is newer, re-rendering")

    # decode meshopt/Draco into plain buffers Blender can read
    plain = os.path.join(decoded_dir, f"{name}.glb")
    if not os.path.exists(plain):
        rc = os.system(f'gltf-transform cp "{path}" "{plain}" >/dev/null 2>&1')
        if rc != 0 or not os.path.exists(plain):
            shutil.copy(path, plain)

    scene, cam = setup_scene()
    try:
        bpy.ops.import_scene.gltf(filepath=plain)
    except Exception as e:
        print(f"[thumbs] SKIP {name}: {e}")
        skipped += 1
        continue

    meshes = [o for o in scene.objects if o.type == "MESH"]
    if not meshes:
        print(f"[thumbs] SKIP {name}: no meshes")
        skipped += 1
        continue

    warm_untextured(meshes)

    lo, hi = bounds(meshes)
    centre = (lo + hi) / 2
    radius = max((hi - lo).length / 2, 1e-3)

    # 3/4 view from slightly above. 2.5x fills the card without cropping
    # wide items such as a 4.4 m sectional.
    direction = Vector((1.0, -1.4, 0.68)).normalized()
    cam.location = centre + direction * (radius * 2.5)
    cam.rotation_euler = (centre - cam.location).to_track_quat("-Z", "Y").to_euler()

    scene.render.filepath = dest
    bpy.ops.render.render(write_still=True)
    print(f"[thumbs] {name}.webp")
    done += 1

shutil.rmtree(decoded_dir, ignore_errors=True)
print(f"[thumbs] rendered {done}, up to date {skipped}")
PY

blender --background --factory-startup --python "$TMP/thumbs.py" -- \
        "$MODELS" "$OUT" "$SIZE" "$BG" "$FORCE"
rm -rf "$TMP"

echo
echo "✅ Thumbnails in $OUT"
du -sh "$OUT" 2>/dev/null || true

# Fail loudly if any model still lacks a preview — a silent gap means a grey
# card in the catalog, which is the exact problem this script exists to fix.
missing=0
while IFS= read -r m; do
  base="$(basename "${m%.glb}")"
  [ -f "$OUT/$base.webp" ] || { echo "⚠️  no thumbnail for $base"; missing=$((missing+1)); }
done < <(find "$MODELS" -name '*.glb' -not -path '*_decoded*')

if [ "$missing" -gt 0 ]; then
  echo
  echo "$missing model(s) without a preview — see warnings above."
  exit 1
fi