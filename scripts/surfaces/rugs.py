"""
Rug artwork for the procedural rugs (components/decor/WallDecor.tsx, "rug").
Each image is the WHOLE rug (not a tile), plus one small tiling wool-fibre
normal map shared by all. usage: python3 scripts/surfaces/rugs.py public/textures/rugs
"""
import numpy as np, sys, os
from PIL import Image, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else "rugs"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(3)

def noise(h, w, beta, seed):
    r = np.random.default_rng(seed)
    fy = np.fft.fftfreq(h)[:, None] * h; fx = np.fft.fftfreq(w)[None, :] * w
    f = np.sqrt(fx ** 2 + fy ** 2); amp = np.where(f > 0, 1 / np.maximum(f, 1e-6) ** beta, 0)
    z = np.real(np.fft.ifft2(amp * np.exp(1j * r.uniform(0, 2 * np.pi, (h, w)))))
    return (z - z.mean()) / (z.std() + 1e-9)

def srgb(h): h = h.lstrip('#'); return np.array([int(h[i:i+2], 16) / 255 for i in (0, 2, 4)])
def mix(a, b, t): t = np.clip(t, 0, 1)[..., None]; return a * (1 - t) + b * t
def save(name, col): Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8)).save(f"{OUT}/{name}.jpg", quality=88)

H, W = 1024, 1440   # 2:1.4 rug proportions; stretched to the rug's size
Y, X = np.mgrid[0:H, 0:W] / np.array([H, W])[:, None, None] if False else np.mgrid[0:H, 0:W].astype(float)
u, v = X / W, Y / H
wool = noise(H, W, 1.2, 1) * 0.025 + noise(H, W, 0.3, 2) * 0.02

# 1. Moroccan (Beni Ourain): cream, charcoal diamond lattice drawn by hand
cream, ink = srgb("#ece6da"), srgb("#3b3735")
k = 6
du = (u * k + 0.08 * noise(H, W, 2.2, 3)) % 1.0
dv = (v * k * W / H / 1.4 + 0.08 * noise(H, W, 2.2, 4)) % 1.0
line = np.minimum(np.abs(du - dv), np.abs(du + dv - 1.0))
lat = np.exp(-(line / 0.02) ** 2)
col = mix(cream[None, None] * np.ones((H, W, 1)), ink, lat * 0.9)
save("rug-moroccan", col + wool[..., None])

# 2. Abstract grey: soft brushed clouds in greys and sand
a = noise(H, W, 2.4, 5); b = noise(H, W, 1.6, 6)
col = mix(srgb("#c9c6c1")[None, None] * np.ones((H, W, 1)), srgb("#8f8b86"), 0.5 + 0.35 * a)
col = mix(col, srgb("#d8cdb9"), np.clip(b - 0.8, 0, 1) * 1.5)
save("rug-abstract", col + wool[..., None])

# 3. Bordered (Persian-inspired): field, guard stripes, border, medallion
field, border, guard, accent = srgb("#b9a487"), srgb("#5b2e2a"), srgb("#e2d6bf"), srgb("#2f3b52")
dx = np.minimum(u, 1 - u) * W / H * 1.0; dy = np.minimum(v, 1 - v)
d = np.minimum(dx, dy)
col = field[None, None] * np.ones((H, W, 1))
col = mix(col, border, (d < 0.11).astype(float))
col = mix(col, guard, ((d > 0.02) & (d < 0.03)).astype(float) + ((d > 0.095) & (d < 0.105)).astype(float))
motif = (np.sin(u * W / H * 60) * np.sin(v * 60) > 0.6) & (d > 0.04) & (d < 0.09)
col = mix(col, accent, motif.astype(float) * 0.8)
cx, cy = (u - 0.5) * W / H, (v - 0.5)
r = np.sqrt((cx / 1.3) ** 2 + cy ** 2)
med = (r < 0.18 + 0.02 * np.sin(np.arctan2(cy, cx) * 8)).astype(float)
col = mix(col, border, med * 0.85)
col = mix(col, guard, ((r < 0.07)).astype(float) * 0.9)
col = col * (1 + 0.06 * noise(H, W, 2.0, 7))[..., None]  # aged, uneven dye
save("rug-bordered", col + wool[..., None])

# 4. Round jute: braided rings
R = 1024; Yr, Xr = np.mgrid[0:R, 0:R].astype(float); rr = np.hypot(Xr - R / 2, Yr - R / 2) / (R / 2)
ang = np.arctan2(Yr - R / 2, Xr - R / 2)
# concentric braided coils: rings, each with a twisted rope grain
ring = 0.5 + 0.5 * np.sin(rr * 2 * np.pi * 16)
grain = 0.5 + 0.5 * np.sin(ang * 140 + rr * 2 * np.pi * 16 * 3)
braid = ring * 0.7 + grain * 0.3 * ring
col = mix(srgb("#b48d5c")[None, None] * np.ones((R, R, 1)), srgb("#d9bb8a"), braid)
col = col + (noise(R, R, 0.6, 8) * 0.03)[..., None]
save("rug-jute-round", col)

# wool fibre normal map (tiles)
N = 512
h = noise(N, N, 0.8, 9)
gx = np.roll(h, -1, 1) - np.roll(h, 1, 1); gy = np.roll(h, -1, 0) - np.roll(h, 1, 0)
n = np.stack([-gx * 0.6, gy * 0.6, np.ones_like(h)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
save("rug-fibre-normal", n * 0.5 + 0.5)
print("ok")
