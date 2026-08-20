#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Split a multi-prop set (decor sets, furniture sets) into individual GLB props
#
# The problem this solves: sets like "decorative set Vol005" arrive as one file
# containing dozens of objects with meaningless names (shk00..shk56), where a
# single prop (a stack of books, a lamp) is often several separate objects.
# Exporting one file per object gives you fragments; exporting the whole thing
# gives you an unusable pile.
#
# So this clusters objects by physical proximity — parts that sit within a few
# centimetres of each other are treated as one prop — then exports each cluster
# and RENDERS A THUMBNAIL of it, so you can see what you actually have.
#
# ── Usage ────────────────────────────────────────────────────────────────────
#   ./split-set.sh <input.obj|input.fbx> <output-dir> [gap-cm] [tris-per-prop]
#   ./split-set.sh "decorative set Vol005.obj" ./decor-out 8 12000
#
# Then open <output-dir>/thumbs/ in Finder and look at the previews.
# props.json lists each prop's size in cm and its file.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

IN="${1:?usage: split-set.sh <input.obj|.fbx> <output-dir> [gap-cm] [tris-per-prop]}"
OUT="${2:?missing output dir}"
GAP_CM="${3:-2}"          # parts closer than this are the same prop
TRIS="${4:-12000}"        # triangle budget per prop — decor is small on screen

mkdir -p "$OUT/glb" "$OUT/thumbs"
TMP="$(mktemp -d)"

cat > "$TMP/split.py" <<'PY'
import bpy, bmesh, sys, os, json, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
src, out_dir, gap_cm, tris = argv[0], argv[1], float(argv[2]), int(argv[3])

bpy.ops.wm.read_factory_settings(use_empty=True)

ext = os.path.splitext(src)[1].lower()
if ext == ".obj":
    try:    bpy.ops.wm.obj_import(filepath=src)
    except AttributeError: bpy.ops.import_scene.obj(filepath=src)
elif ext == ".fbx":
    bpy.ops.import_scene.fbx(filepath=src)
else:
    raise SystemExit(f"unsupported input: {ext}")

meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
print(f"[split] imported {len(meshes)} objects")
if not meshes:
    raise SystemExit("no meshes found")

# ── Work out the file's unit scale ───────────────────────────────────────────
# 3ds Max exports are usually millimetres or centimetres; Blender assumes
# metres. Guess from the overall size: a decor set is a few metres across, so
# if the bounds come out in the thousands the file is in mm.
def world_bbox(obj):
    cs = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    return (Vector((min(c.x for c in cs), min(c.y for c in cs), min(c.z for c in cs))),
            Vector((max(c.x for c in cs), max(c.y for c in cs), max(c.z for c in cs))))

# Use the MEDIAN object size, not the overall span: render scenes often
# contain a backdrop plane or studio rig that is orders of magnitude larger
# than the props, and that outlier wrecks a span-based guess.
def diag(o):
    lo, hi = world_bbox(o)
    return max(hi[i] - lo[i] for i in range(3))

diags = sorted(diag(o) for o in meshes)
median = diags[len(diags)//2]

if   median > 200: unit_to_m = 0.001   # millimetres (a 30cm prop ~ 300 units)
elif median > 20:  unit_to_m = 0.01    # centimetres (~30 units)
else:              unit_to_m = 1.0     # metres (~0.3 units)
print(f"[split] median object size {median:.1f} units -> scale {unit_to_m} (m per unit)")
print(f"[split] object size range: {diags[0]:.1f} .. {diags[-1]:.1f} units")

# Drop anything absurd for a prop (backdrops, floor planes, light rigs).
MAX_PROP_M = 3.0
keep = [o for o in meshes if diag(o) * unit_to_m <= MAX_PROP_M]
dropped = len(meshes) - len(keep)
if dropped:
    print(f"[split] ignoring {dropped} oversized object(s) (> {MAX_PROP_M} m — backdrop/rig)")
meshes = keep
if not meshes:
    raise SystemExit("every object was oversized — check the scale guess above")

gap = (gap_cm / 100.0) / unit_to_m    # cluster gap, in file units

# ── Cluster objects whose bounding boxes are within `gap` of each other ──────
boxes = {o.name: world_bbox(o) for o in meshes}

def near(a, b):
    (alo, ahi), (blo, bhi) = boxes[a.name], boxes[b.name]
    for i in range(3):
        if alo[i] - bhi[i] > gap or blo[i] - ahi[i] > gap:
            return False
    return True

parent = {o.name: o.name for o in meshes}
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]; x = parent[x]
    return x
def union(a, b):
    ra, rb = find(a), find(b)
    if ra != rb: parent[rb] = ra

for i, a in enumerate(meshes):
    for b in meshes[i+1:]:
        if near(a, b): union(a.name, b.name)

clusters = {}
for o in meshes:
    clusters.setdefault(find(o.name), []).append(o)

# Guard: if a cluster grew past a believable prop size, the gap was too
# generous for this file — break that cluster back into individual objects
# rather than emitting a blob.
MAX_CLUSTER_M = 2.0
guarded = {}
split_back = 0
for root, objs in clusters.items():
    lo = Vector((math.inf,)*3); hi = Vector((-math.inf,)*3)
    for o in objs:
        a, b = world_bbox(o)
        for i in range(3):
            lo[i] = min(lo[i], a[i]); hi[i] = max(hi[i], b[i])
    size_m = max(hi[i] - lo[i] for i in range(3)) * unit_to_m
    if size_m > MAX_CLUSTER_M and len(objs) > 1:
        split_back += 1
        for o in objs:
            guarded[o.name] = [o]
    else:
        guarded[root] = objs
clusters = guarded
if split_back:
    print(f"[split] {split_back} oversized cluster(s) split back into single objects")
print(f"[split] grouped into {len(clusters)} props")

# ── Render setup for thumbnails ──────────────────────────────────────────────
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in \
    [i.identifier for i in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
scene.render.resolution_x = scene.render.resolution_y = 256
scene.render.film_transparent = True

cam_data = bpy.data.cameras.new("thumb_cam")
cam = bpy.data.objects.new("thumb_cam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam

sun_data = bpy.data.lights.new("sun", type="SUN")
sun_data.energy = 3.0
sun = bpy.data.objects.new("sun", sun_data)
sun.rotation_euler = (math.radians(55), 0, math.radians(35))
scene.collection.objects.link(sun)

manifest = []

for idx, (root, objs) in enumerate(sorted(clusters.items(), key=lambda kv: -len(kv[1])), start=1):
    name = f"prop_{idx:02d}"

    # hide everything, show only this cluster
    for o in meshes:
        o.hide_render = o not in objs
        o.hide_set(o not in objs)

    # join a copy so the source stays intact for later clusters
    bpy.ops.object.select_all(action="DESELECT")
    copies = []
    for o in objs:
        c = o.copy(); c.data = o.data.copy()
        scene.collection.objects.link(c); copies.append(c)
        c.select_set(True)
    bpy.context.view_layer.objects.active = copies[0]
    if len(copies) > 1:
        bpy.ops.object.join()
    prop = bpy.context.view_layer.objects.active

    # scale to metres, drop to the floor, centre on origin
    prop.scale = (unit_to_m,)*3
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    lo, hi = world_bbox(prop)
    prop.location -= Vector(((lo.x+hi.x)/2, (lo.y+hi.y)/2, lo.z))
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    lo, hi = world_bbox(prop)
    size_cm = tuple(round((hi[i]-lo[i]) * 100, 1) for i in range(3))

    # skip specks — stray verts and tiny offcuts aren't props
    if max(size_cm) < 3:
        bpy.data.objects.remove(prop, do_unlink=True)
        continue

    # decimate
    faces = len(prop.data.polygons)
    if faces > tris:
        m = prop.modifiers.new("dec", "DECIMATE")
        m.ratio = max(0.02, tris / float(faces))
        bpy.context.view_layer.objects.active = prop
        bpy.ops.object.modifier_apply(modifier=m.name)

    # ── thumbnail ──
    for o in bpy.context.scene.objects:
        if o.type == "MESH": o.hide_render = (o is not prop)
    r = max(hi[i]-lo[i] for i in range(3))
    cam.location = Vector((r*1.6, -r*1.9, r*1.35))
    d = Vector(((lo.x+hi.x)/2, (lo.y+hi.y)/2, (lo.z+hi.z)/2)) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    cam_data.lens = 50
    scene.render.filepath = os.path.join(out_dir, "thumbs", f"{name}.png")
    bpy.ops.render.render(write_still=True)

    # ── export ──
    bpy.ops.object.select_all(action="DESELECT")
    prop.select_set(True)
    bpy.context.view_layer.objects.active = prop
    glb = os.path.join(out_dir, "glb", f"{name}.glb")
    bpy.ops.export_scene.gltf(
        filepath=glb, export_format="GLB", use_selection=True,
        export_apply=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )

    manifest.append({
        "name": name,
        "file": f"glb/{name}.glb",
        "thumb": f"thumbs/{name}.png",
        "parts": len(objs),
        "size_cm": {"w": size_cm[0], "d": size_cm[1], "h": size_cm[2]},
        "kb": round(os.path.getsize(glb)/1024),
    })
    print(f"[split] {name}: {len(objs)} parts, {size_cm} cm, {manifest[-1]['kb']} KB")

    bpy.data.objects.remove(prop, do_unlink=True)

with open(os.path.join(out_dir, "props.json"), "w") as f:
    json.dump(manifest, f, indent=2)
print(f"[split] done — {len(manifest)} props written")
PY

blender --background --factory-startup --python "$TMP/split.py" -- \
        "$IN" "$OUT" "$GAP_CM" "$TRIS"
rm -rf "$TMP"

echo
echo "✅ Props written to $OUT/glb, previews in $OUT/thumbs"
echo
echo "Next:"
echo "  1. open $OUT/thumbs      # look at the previews"
echo "  2. note which prop_NN files are worth keeping"
echo "  3. props.json has each prop's real size in cm for the catalog"