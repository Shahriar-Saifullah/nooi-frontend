"""
Procedural, tileable PBR surfaces for Nooi. Everything is periodic (spectral
noise on an integer frequency grid, wrapped distances), so each image tiles
with no seams. Outputs <id>_color.jpg, <id>_normal.jpg, <id>_rough.jpg.
"""
import numpy as np, sys, os
from PIL import Image

# usage: python3 scripts/surfaces/gen.py public/textures/surfaces
OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
os.makedirs(OUT, exist_ok=True)
N = 2048
rng = np.random.default_rng(7)

def fnoise(n, beta, seed, lo=1, hi=None, aniso=(1.0, 1.0)):
    """Periodic 1/f^beta noise in [-1,1] approx (zero mean, unit std)."""
    r = np.random.default_rng(seed)
    fx = np.fft.fftfreq(n) * n
    FX, FY = np.meshgrid(fx, fx)
    f = np.sqrt((FX * aniso[0]) ** 2 + (FY * aniso[1]) ** 2)
    amp = np.where(f >= lo, 1.0 / np.maximum(f, 1e-6) ** beta, 0.0)
    if hi: amp = amp * np.exp(-(f / hi) ** 2)
    ph = r.uniform(0, 2 * np.pi, (n, n))
    z = np.real(np.fft.ifft2(amp * np.exp(1j * ph)))
    return (z - z.mean()) / (z.std() + 1e-9)

def grad(h):
    return (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / 2, (np.roll(h, -1, 0) - np.roll(h, 1, 0)) / 2

def normal_map(h, strength):
    gx, gy = grad(h)
    nx, ny, nz = -gx * strength, gy * strength, np.ones_like(h)
    l = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    rgb = np.stack([nx / l, ny / l, nz / l], -1) * 0.5 + 0.5
    return rgb

def save(id_, color, height=None, nstrength=0, rough=None, size=N):
    def to_img(a): return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    to_img(color).resize((size, size), Image.LANCZOS).save(f"{OUT}/{id_}_color.jpg", quality=86, optimize=True)
    if height is not None and nstrength:
        to_img(normal_map(height, nstrength)).resize((1024, 1024), Image.LANCZOS).save(f"{OUT}/{id_}_normal.jpg", quality=90)
    if rough is not None:
        r = np.clip(rough, 0, 1)
        to_img(np.stack([r, r, r], -1)).resize((1024, 1024), Image.LANCZOS).save(f"{OUT}/{id_}_rough.jpg", quality=88)
    # a 256 px swatch for the finish pickers: a crop, so it shows true scale
    c = Image.open(f"{OUT}/{id_}_color.jpg")
    c.crop((0, 0, c.size[0] // 2, c.size[1] // 2)).resize((256, 256), Image.LANCZOS).save(f"{OUT}/{id_}_thumb.jpg", quality=85)
    print("wrote", id_)

def mix(a, b, t):
    t = t[..., None]
    return np.asarray(a) * (1 - t) + np.asarray(b) * t

def srgb(h): h = h.lstrip('#'); return np.array([int(h[i:i+2], 16) / 255 for i in (0, 2, 4)])

xs = np.arange(N) / N
X, Y = np.meshgrid(xs, xs)

# ── marble ─────────────────────────────────────────────────────────────────
def marble(id_, base, base2, vein, vein2, seed, kx=1, ky=1, warp=1.6, width=70.0, fine=0.6):
    """Veins at three scales, each a level line of a warped stripe field. The
    warp is fractal (low + mid + a little high frequency) so the veins flow
    in long lines but have the ragged edges and branching of real stone."""
    def family(k, s0, warp_, width_, opacity):
        kx_, ky_ = k
        ph = (2 * np.pi * (kx_ * X + ky_ * Y)
              + warp_ * fnoise(N, 2.4, s0, hi=6)
              + 0.6 * fnoise(N, 2.1, s0 + 1, hi=16)
              + 0.22 * fnoise(N, 1.8, s0 + 2, hi=60)
              + 0.06 * fnoise(N, 1.4, s0 + 3, hi=250))
        thick = np.clip(0.55 + 0.55 * fnoise(N, 2.0, s0 + 4, hi=10), 0.08, 1.5)
        line = np.exp(-width_ / thick * np.sin(ph / 2) ** 2)
        halo = np.exp(-width_ / thick / 10 * np.sin(ph / 2) ** 2)
        fade = np.clip(fnoise(N, 2.2, s0 + 5, hi=6) * 0.6 + 0.7, 0, 1)
        return line * fade * opacity, halo * fade * opacity
    m1, h1 = family((kx, ky), seed, warp, width, 1.0)
    m2, h2 = family((ky + 1, -kx), seed + 20, warp * 1.2, width * 3, 0.65)
    m3, _ = family((3, 2), seed + 40, warp * 1.5, width * 9, 0.45 * fine)
    cloud = np.clip(fnoise(N, 2.2, seed + 60, hi=20) * 0.3 + 0.5, 0, 1)
    col = mix(srgb(base), srgb(base2), np.clip(cloud + 0.35 * h1 + 0.2 * h2, 0, 1))
    col = mix(col, srgb(vein2), np.clip(m3 + m2 * 0.6, 0, 1))
    col = mix(col, srgb(vein), np.clip(m1 + m2 * 0.4, 0, 1))
    col = col + (fnoise(N, 0.4, seed + 7) * 0.01)[..., None]
    rough = 0.16 + 0.04 * cloud + 0.05 * m1
    save(id_, col, rough=rough)

marble("marble-calacatta", "#f4f2ee", "#e6e1d8", "#9c8b78", "#c4b8a8", 11, kx=1, ky=1, warp=1.8, width=90)
marble("marble-nero", "#121214", "#1d1c1f", "#ebe8e3", "#9a9794", 21, kx=1, ky=2, warp=2.2, width=140, fine=0.8)
marble("marble-emperador", "#563f31", "#6e5341", "#d9c4a6", "#3a2a20", 31, kx=2, ky=1, warp=2.0, width=40, fine=1.0)

# ── travertine ─────────────────────────────────────────────────────────────
def travertine(id_, seed):
    bands = fnoise(N, 2.2, seed, aniso=(1.0, 0.08))  # long horizontal layers
    cloud = fnoise(N, 1.8, seed + 1, hi=80)
    pits_field = fnoise(N, 1.0, seed + 2, lo=40, aniso=(1.0, 0.25))
    pits = np.clip((pits_field - 1.6) * 1.5, 0, 1)
    col = mix(srgb("#e5d7c0"), srgb("#cdb898"), np.clip(bands * 0.35 + 0.5 + cloud * 0.15, 0, 1))
    col = mix(col, srgb("#9c8667"), pits * 0.8)
    height = -pits * 3 + bands * 0.15
    rough = 0.45 + 0.3 * pits
    save(id_, col, height, 2.0, rough)
travertine("travertine-honed", 41)

# ── microcement & plaster ──────────────────────────────────────────────────
def cloudy(id_, a, b, seed, rough_base, trowel=False, bump=1.0, wall=False):
    c1 = fnoise(N, 2.1, seed, hi=50)
    c2 = fnoise(N, 1.4, seed + 1, hi=300)
    t = np.clip(0.5 + 0.28 * c1 + 0.08 * c2, 0, 1)
    if trowel:  # overlapping arcs of a trowel: anisotropic streaks
        t = np.clip(t + 0.10 * fnoise(N, 1.6, seed + 2, aniso=(1.0, 0.3), hi=90), 0, 1)
    col = mix(srgb(a), srgb(b), t)
    height = c2 * 0.6 + c1 * 0.4
    rough = rough_base + 0.08 * (c1 * 0.5)
    save(id_, col, height, bump, rough)
cloudy("microcement-pearl", "#d9d5ce", "#c4bfb6", 51, 0.55, trowel=True, bump=0.8)
cloudy("limewash-white", "#f1ede6", "#e2dbcf", 61, 0.92, bump=1.6)
cloudy("limewash-taupe", "#c8b9a6", "#ab9a85", 71, 0.92, bump=1.6)

# ── terrazzo ───────────────────────────────────────────────────────────────
def terrazzo(id_, base, chips, seed, count=2600):
    r = np.random.default_rng(seed)
    col = np.ones((N, N, 3)) * srgb(base)
    col = col + (fnoise(N, 1.5, seed, hi=100) * 0.02)[..., None]
    rough = np.full((N, N), 0.32)
    yy, xx = np.mgrid[0:N, 0:N]
    for _ in range(count):
        cx, cy = r.uniform(0, N, 2)
        rad = r.choice([4, 6, 9, 14, 22], p=[.35, .3, .2, .1, .05]) * r.uniform(.7, 1.3)
        ang = r.uniform(0, np.pi); e = r.uniform(.5, 1)
        c = srgb(r.choice(chips))
        x0, x1 = int(cx - rad - 2), int(cx + rad + 3); y0, y1 = int(cy - rad - 2), int(cy + rad + 3)
        sy, sx = np.mgrid[y0:y1, x0:x1]
        dx, dy = sx - cx, sy - cy
        u = dx * np.cos(ang) + dy * np.sin(ang); v = (-dx * np.sin(ang) + dy * np.cos(ang)) / e
        jag = 1 + 0.25 * np.sin(np.arctan2(v, u) * r.integers(3, 7) + r.uniform(0, 6))
        m = (u ** 2 + v ** 2) < (rad * jag) ** 2
        col[sy[m] % N, sx[m] % N] = c * r.uniform(.9, 1.08)
        rough[sy[m] % N, sx[m] % N] = 0.2
    save(id_, col, rough=rough)
terrazzo("terrazzo-classic", "#ece7df", ["#8f8a83", "#c9c2b6", "#b5654b", "#4f5a5e", "#d9cfc0", "#2b2a29"], 81)

# ── porcelain tile with grout ──────────────────────────────────────────────
def tiles(id_, a, b, grout, n_tiles, seed, gw=0.004):
    # the image is n_tiles x n_tiles tiles; gw = grout width as fraction of the image
    cloud = fnoise(N, 1.9, seed, hi=60)
    col = mix(srgb(a), srgb(b), np.clip(0.5 + 0.25 * cloud, 0, 1))
    gx = np.abs(((X * n_tiles) % 1) - 0.5) > 0.5 - gw * n_tiles / 2
    gy = np.abs(((Y * n_tiles) % 1) - 0.5) > 0.5 - gw * n_tiles / 2
    g = (gx | gy).astype(float)
    col = mix(col, srgb(grout), g)
    height = -g * 2.0
    rough = 0.3 + 0.5 * g
    save(id_, col, height, 3.0, rough)
tiles("porcelain-light-grey", "#d6d4d0", "#cbc8c3", "#b9b5ae", 2, 91)

# ── linen wall covering ────────────────────────────────────────────────────
def linen(id_, a, seed, threads=420):
    wx = np.sin(2 * np.pi * threads * X) * 0.5 + 0.5
    wy = np.sin(2 * np.pi * threads * Y) * 0.5 + 0.5
    slub = fnoise(N, 1.0, seed, aniso=(1.0, 0.02))  # thick/thin yarns along x
    slub2 = fnoise(N, 1.0, seed + 1, aniso=(0.02, 1.0))
    h = wx * (0.6 + 0.15 * slub2) + wy * (0.6 + 0.15 * slub)
    col = srgb(a) * (0.92 + 0.08 * (h / h.max()))[..., None] + (0.03 * slub)[..., None]
    save(id_, col, h, 4.0, np.full((N, N), 0.9))
linen("linen-sand", "#cfc2ad", 101)

# ── wood planks ────────────────────────────────────────────────────────────
def planks(id_, light, dark, seed, rows=8, cols=2, rough_base=0.45):
    # image covers rows planks across (y) and `cols` lengths along (x)
    r = np.random.default_rng(seed)
    py = (Y * rows)
    row = np.floor(py).astype(int) % rows
    offs = r.uniform(0, 1, rows)
    px = (X * cols + offs[row]) % 1.0
    seg = (np.floor(X * cols + offs[row]).astype(int)) % cols
    pid = row * cols + seg
    tint = r.uniform(-0.08, 0.08, rows * cols)[pid]
    # grain: stretched noise, different per plank
    grain = np.zeros((N, N))
    for k in range(4):
        g = fnoise(N, 1.3, seed + 10 + k, aniso=(1.0, 0.03), hi=400)
        grain += np.where(pid % 4 == k, g, 0)
    rings = np.sin(2 * np.pi * (6 * (py % 1) + 1.5 * fnoise(N, 2.0, seed + 20, aniso=(1.0, 0.05)))) * 0.5 + 0.5
    t = np.clip(0.5 + 0.18 * grain + 0.18 * (rings - 0.5) + tint, 0, 1)
    col = mix(srgb(light), srgb(dark), t)
    gapy = (np.abs((py % 1) - 0.5) > 0.494)
    gapx = (np.abs(px - 0.5) > 0.4985)
    gap = (gapy | gapx).astype(float)
    col = mix(col, srgb(dark) * 0.55, gap * 0.85)
    height = grain * 0.3 - gap * 3
    rough = rough_base + 0.1 * (rings - 0.5) + 0.3 * gap
    save(id_, col, height, 2.0, rough)
planks("oak-plank-light", "#d7b98f", "#a9845a", 111)
planks("walnut-plank", "#7a573d", "#4a3122", 121, rough_base=0.4)
