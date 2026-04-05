"""
Generate a proper Utah Teapot .OBJ using surface-of-revolution profiles.
Creates body, lid, spout, and handle as separate meshes.
"""
import math, os

OUT = os.path.join(os.path.dirname(__file__), "static", "models")
os.makedirs(OUT, exist_ok=True)

vertices = []
faces = []

def add_vert(x, y, z, r=0.7, g=0.5, b=0.8):
    vertices.append((x, y, z, r, g, b))
    return len(vertices)

def revolve_profile(profile_pts, segments=24, color_func=None):
    """Revolve a 2D profile (r, y) around Y axis to create a surface."""
    rings = []
    for i, (r, y) in enumerate(profile_pts):
        ring = []
        for j in range(segments):
            angle = 2 * math.pi * j / segments
            x = r * math.cos(angle)
            z = r * math.sin(angle)
            t = i / max(len(profile_pts) - 1, 1)
            if color_func:
                cr, cg, cb = color_func(t, j / segments)
            else:
                cr = 0.55 + 0.25 * t
                cg = 0.35 + 0.15 * (1 - t)
                cb = 0.65 + 0.2 * (j / segments)
            idx = add_vert(x, y, z, cr, cg, cb)
            ring.append(idx)
        rings.append(ring)

    # Connect rings with faces
    for i in range(len(rings) - 1):
        for j in range(segments):
            j_next = (j + 1) % segments
            a = rings[i][j]
            b = rings[i][j_next]
            c = rings[i + 1][j_next]
            d = rings[i + 1][j]
            faces.append((a, b, c))
            faces.append((a, c, d))

def body_color(t, a):
    return (0.55 + 0.2 * t, 0.38 + 0.12 * (1 - t), 0.65 + 0.15 * a)

# ── BODY ──────────────────────────────────────────────────────────
# Classic teapot body profile (radius, height)
body_profile = [
    (0.0,  -0.7),   # bottom center
    (0.25, -0.7),   # bottom edge
    (0.52, -0.68),
    (0.72, -0.55),
    (0.82, -0.35),
    (0.87, -0.1),
    (0.88,  0.1),   # widest
    (0.86,  0.3),
    (0.80,  0.45),
    (0.70,  0.58),
    (0.58,  0.65),
    (0.50,  0.68),  # neck
    (0.48,  0.70),  # rim
]
revolve_profile(body_profile, segments=28, color_func=body_color)

# ── LID ───────────────────────────────────────────────────────────
lid_profile = [
    (0.50,  0.70),  # rim (matches body top)
    (0.48,  0.73),
    (0.42,  0.78),
    (0.34,  0.82),
    (0.24,  0.85),
    (0.14,  0.86),
    (0.06,  0.86),
    (0.0,   0.86),  # center
]

def lid_color(t, a):
    return (0.60 + 0.15 * t, 0.40 + 0.10 * t, 0.70 + 0.10 * a)

revolve_profile(lid_profile, segments=28, color_func=lid_color)

# Lid knob
knob_profile = [
    (0.0,  0.86),
    (0.06, 0.88),
    (0.08, 0.92),
    (0.07, 0.96),
    (0.04, 0.99),
    (0.0,  1.00),
]

def knob_color(t, a):
    return (0.65, 0.42, 0.75)

revolve_profile(knob_profile, segments=12, color_func=knob_color)

# ── SPOUT ─────────────────────────────────────────────────────────
# Spout as a bent tube going outward
def add_tube_segment(center, direction, radius, segments=10, color=(0.6, 0.4, 0.7)):
    """Add a tube ring at a given center pointing in direction."""
    # Build a coordinate frame
    d = [direction[0], direction[1], direction[2]]
    length = math.sqrt(d[0]**2 + d[1]**2 + d[2]**2)
    d = [x / length for x in d]

    # Find two perpendicular vectors
    if abs(d[1]) < 0.9:
        up = (0, 1, 0)
    else:
        up = (1, 0, 0)
    # Cross product d x up
    right = (
        d[1] * up[2] - d[2] * up[1],
        d[2] * up[0] - d[0] * up[2],
        d[0] * up[1] - d[1] * up[0],
    )
    rl = math.sqrt(right[0]**2 + right[1]**2 + right[2]**2)
    right = (right[0]/rl, right[1]/rl, right[2]/rl)
    # Cross d x right for true up
    up2 = (
        d[1] * right[2] - d[2] * right[1],
        d[2] * right[0] - d[0] * right[2],
        d[0] * right[1] - d[1] * right[0],
    )

    ring = []
    for i in range(segments):
        angle = 2 * math.pi * i / segments
        x = center[0] + radius * (math.cos(angle) * right[0] + math.sin(angle) * up2[0])
        y = center[1] + radius * (math.cos(angle) * right[1] + math.sin(angle) * up2[1])
        z = center[2] + radius * (math.cos(angle) * right[2] + math.sin(angle) * up2[2])
        idx = add_vert(x, y, z, color[0], color[1], color[2])
        ring.append(idx)
    return ring

# Spout path: curve from body outward and upward
spout_segments = 10
tube_segments = 8
spout_rings = []
for i in range(spout_segments + 1):
    t = i / spout_segments
    # Quadratic bezier-ish curve
    x = 0.85 + t * 0.65  # go outward
    y = -0.05 + t * 0.45 + t * t * 0.15  # curve upward
    z = 0.0
    radius = 0.12 - t * 0.05  # taper
    dx = 0.65
    dy = 0.45 + 2 * t * 0.15
    col = (0.58 + 0.12 * t, 0.40, 0.68 + 0.12 * t)
    ring = add_tube_segment((x, y, z), (dx, dy, 0), radius, tube_segments, col)
    spout_rings.append(ring)

# Connect spout rings
for i in range(len(spout_rings) - 1):
    for j in range(tube_segments):
        j_next = (j + 1) % tube_segments
        a = spout_rings[i][j]
        b = spout_rings[i][j_next]
        c = spout_rings[i + 1][j_next]
        d = spout_rings[i + 1][j]
        faces.append((a, b, c))
        faces.append((a, c, d))

# ── HANDLE ────────────────────────────────────────────────────────
# Handle as a C-shaped tube on the opposite side
handle_segments = 16
handle_tube_segments = 8
handle_rings = []
for i in range(handle_segments + 1):
    t = i / handle_segments
    angle = math.pi * 0.15 + t * math.pi * 0.7  # arc from top to bottom
    # Handle center traces a C-shape
    cx = -0.88 - 0.35 * math.sin(angle)
    cy = 0.5 - 0.55 * math.cos(angle)  # from top to bottom of body
    cz = 0.0
    # Direction tangent
    dx = -0.35 * math.cos(angle)
    dy = 0.55 * math.sin(angle)
    radius = 0.07 + 0.02 * math.sin(math.pi * t)  # slightly thicker in middle
    col = (0.55 + 0.1 * t, 0.38, 0.65 + 0.1 * t)
    ring = add_tube_segment((cx, cy, cz), (dx, dy, 0), radius, handle_tube_segments, col)
    handle_rings.append(ring)

# Connect handle rings
for i in range(len(handle_rings) - 1):
    for j in range(handle_tube_segments):
        j_next = (j + 1) % handle_tube_segments
        a = handle_rings[i][j]
        b = handle_rings[i][j_next]
        c = handle_rings[i + 1][j_next]
        d = handle_rings[i + 1][j]
        faces.append((a, b, c))
        faces.append((a, c, d))

# ── BOTTOM (flat disc) ────────────────────────────────────────────
bottom_profile = [
    (0.0,  -0.72),
    (0.15, -0.72),
    (0.25, -0.72),
]

def bottom_color(t, a):
    return (0.50, 0.35, 0.60)

revolve_profile(bottom_profile, segments=16, color_func=bottom_color)

# ── WRITE OBJ ─────────────────────────────────────────────────────
lines = [
    "# Utah Teapot - Generated for 3D Steganography Vault",
    f"# {len(vertices)} vertices, {len(faces)} faces",
    "# Includes: body, lid, knob, spout, handle, bottom",
    "",
]

for v in vertices:
    lines.append(f"v {v[0]:.5f} {v[1]:.5f} {v[2]:.5f} {v[3]:.3f} {v[4]:.3f} {v[5]:.3f}")

lines.append("")
for f in faces:
    lines.append(f"f {f[0]} {f[1]} {f[2]}")

outpath = os.path.join(OUT, "teapot.obj")
with open(outpath, "w") as f:
    f.write("\n".join(lines))

print(f"✅  Teapot: {len(vertices)} vertices, {len(faces)} faces")
print(f"   Capacity: ~{len(vertices) * 3} chars ({len(vertices) * 3 * 8} bits)")
print(f"   Written to {outpath}")
