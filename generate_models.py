"""Generate OBJ model files with vertex colors for the steganography app."""
import math, os

OUT = os.path.join(os.path.dirname(__file__), "static", "models")
os.makedirs(OUT, exist_ok=True)

# ── CUBE ─────────────────────────────────────────────────────────────────────
def make_cube():
    verts = [
        (-1,-1, 1, 0.9,0.3,0.9),
        ( 1,-1, 1, 0.3,0.9,0.9),
        ( 1, 1, 1, 0.9,0.9,0.3),
        (-1, 1, 1, 0.3,0.3,0.9),
        (-1,-1,-1, 0.9,0.6,0.3),
        ( 1,-1,-1, 0.3,0.9,0.6),
        ( 1, 1,-1, 0.6,0.3,0.9),
        (-1, 1,-1, 0.9,0.3,0.6),
    ]
    faces = [
        (1,2,3),(1,3,4),  # front
        (5,8,7),(5,7,6),  # back
        (1,5,6),(1,6,2),  # bottom
        (4,3,7),(4,7,8),  # top
        (2,6,7),(2,7,3),  # right
        (1,4,8),(1,8,5),  # left
    ]
    lines = ["# Cube with vertex colors for steganography demo", "# v x y z r g b", ""]
    for v in verts:
        lines.append(f"v {v[0]:.3f} {v[1]:.3f} {v[2]:.3f} {v[3]:.3f} {v[4]:.3f} {v[5]:.3f}")
    lines.append("")
    for f in faces:
        lines.append(f"f {f[0]} {f[1]} {f[2]}")
    return "\n".join(lines)

# ── ICOSAHEDRON ───────────────────────────────────────────────────────────────
def make_icosahedron():
    t = (1 + math.sqrt(5)) / 2  # golden ratio ≈ 1.618
    raw = [
        ( 0,  1,  t),  # 1
        ( 0, -1,  t),  # 2
        ( 0,  1, -t),  # 3
        ( 0, -1, -t),  # 4
        ( 1,  t,  0),  # 5
        (-1,  t,  0),  # 6
        ( 1, -t,  0),  # 7
        (-1, -t,  0),  # 8
        ( t,  0,  1),  # 9
        (-t,  0,  1),  # 10
        ( t,  0, -1),  # 11
        (-t,  0, -1),  # 12
    ]
    # Normalize to unit sphere
    n = math.sqrt(1 + t*t)
    verts = [(x/n, y/n, z/n) for x,y,z in raw]
    # Unique vertex colors - purple/cyan/gold palette
    colors = [
        (0.80,0.20,0.90),(0.20,0.85,0.95),(0.95,0.80,0.20),
        (0.20,0.90,0.50),(0.90,0.40,0.20),(0.40,0.20,0.90),
        (0.20,0.70,0.90),(0.90,0.20,0.50),(0.50,0.90,0.20),
        (0.20,0.40,0.95),(0.95,0.20,0.80),(0.60,0.60,0.95),
    ]
    faces = [
        (1,2,9),(1,9,5),(1,5,6),(1,6,10),(1,10,2),
        (4,7,11),(4,11,3),(4,3,12),(4,12,8),(4,8,7),
        (5,9,11),(5,11,3),(5,3,6),(6,3,12),(6,12,10),
        (10,12,8),(10,8,2),(2,8,7),(2,7,9),(9,7,11),
    ]
    lines = ["# Icosahedron with vertex colors for steganography demo", "# v x y z r g b", ""]
    for i,(v,c) in enumerate(zip(verts,colors)):
        lines.append(f"v {v[0]:.5f} {v[1]:.5f} {v[2]:.5f} {c[0]:.3f} {c[1]:.3f} {c[2]:.3f}")
    lines.append("")
    for f in faces:
        lines.append(f"f {f[0]} {f[1]} {f[2]}")
    return "\n".join(lines)

# ── UV SPHERE (Teapot placeholder) ───────────────────────────────────────────
def make_teapot(lat_segs=12, lon_segs=20):
    """UV sphere with squash and color gradient — teapot body placeholder."""
    verts = []
    lines = ["# Teapot (UV sphere placeholder) with vertex colors", "# v x y z r g b", ""]

    def color_for(y, angle):
        # Purple to cyan gradient based on height + angle
        t = (y + 1) / 2  # 0..1
        a = (angle / (2*math.pi))
        r = 0.4 + 0.5 * t
        g = 0.2 + 0.5 * (1 - t)
        b = 0.6 + 0.3 * a
        return (min(r,1), min(g,1), min(b,1))

    # Top pole
    lines.append(f"v 0.000 1.000 0.000 0.800 0.200 0.900")
    verts.append((0, 1, 0))

    for i in range(1, lat_segs):
        theta = math.pi * i / lat_segs
        y = math.cos(theta)
        r = math.sin(theta)
        for j in range(lon_segs):
            phi = 2*math.pi * j / lon_segs
            x = r * math.cos(phi)
            z = r * math.sin(phi)
            c = color_for(y, phi)
            lines.append(f"v {x:.4f} {y:.4f} {z:.4f} {c[0]:.3f} {c[1]:.3f} {c[2]:.3f}")
            verts.append((x,y,z))

    # Bottom pole
    lines.append(f"v 0.000 -1.000 0.000 0.200 0.800 0.950")
    verts.append((0,-1,0))

    lines.append("")
    total = 1 + (lat_segs-1)*lon_segs + 1

    # Top cap (pole = vertex 1)
    for j in range(lon_segs):
        a = 2 + j
        b = 2 + (j+1) % lon_segs
        lines.append(f"f 1 {a} {b}")

    # Middle bands
    for i in range(lat_segs-2):
        for j in range(lon_segs):
            row_start = 2 + i * lon_segs
            next_row_start = 2 + (i+1) * lon_segs
            a = row_start + j
            b = row_start + (j+1) % lon_segs
            c_ = next_row_start + j
            d = next_row_start + (j+1) % lon_segs
            lines.append(f"f {a} {b} {d}")
            lines.append(f"f {a} {d} {c_}")

    # Bottom cap (pole = last vertex)
    bot = total
    for j in range(lon_segs):
        a = 2 + (lat_segs-2)*lon_segs + j
        b = 2 + (lat_segs-2)*lon_segs + (j+1) % lon_segs
        lines.append(f"f {bot} {b} {a}")

    return "\n".join(lines)

# ── WRITE FILES ───────────────────────────────────────────────────────────────
with open(os.path.join(OUT, "cube.obj"), "w") as f:
    f.write(make_cube())

with open(os.path.join(OUT, "icosahedron.obj"), "w") as f:
    f.write(make_icosahedron())

with open(os.path.join(OUT, "teapot.obj"), "w") as f:
    f.write(make_teapot())

print("✅  Generated cube.obj, icosahedron.obj, teapot.obj in", OUT)
v_counts = {}
for name in ["cube", "icosahedron", "teapot"]:
    path = os.path.join(OUT, f"{name}.obj")
    with open(path) as f:
        lines = f.readlines()
    v_counts[name] = sum(1 for l in lines if l.startswith("v "))
    face_count = sum(1 for l in lines if l.startswith("f "))
    print(f"   {name}: {v_counts[name]} vertices, {face_count} faces")
