import math

def generate_sphere_obj(filename, radius=10, sectors=30, stacks=30):
    vertices = []
    for i in range(stacks + 1):
        phi = math.pi * i / stacks
        for j in range(sectors + 1):
            theta = 2 * math.pi * j / sectors
            x = radius * math.sin(phi) * math.cos(theta)
            y = radius * math.cos(phi)
            z = radius * math.sin(phi) * math.sin(theta)
            # Add dummy vertex colors (r g b)
            vertices.append(f"v {x:.4f} {y:.4f} {z:.4f} 0.500 0.500 0.500")

    faces = []
    for i in range(stacks):
        for j in range(sectors):
            first = i * (sectors + 1) + j + 1
            second = first + sectors + 1
            faces.append(f"f {first} {second} {first + 1}")
            faces.append(f"f {second} {second + 1} {first + 1}")

    with open(filename, "w") as f:
        f.write("# Generated Sphere OBJ\n")
        f.write("\n".join(vertices) + "\n")
        f.write("\n".join(faces) + "\n")

def generate_dummy_bunny_obj(filename, segments=40, loops=20):
    # A Torus Knot looks "bunny-like" in complexity
    vertices = []
    p, q = 2, 3
    for i in range(segments):
        for j in range(loops):
            phi = 2 * math.pi * i / segments
            theta = 2 * math.pi * j / loops
            
            # Torus knot equation
            r = 10 * (2 + math.sin(q * phi))
            x = r * math.cos(p * phi) 
            y = r * math.sin(p * phi)
            z = 10 * math.cos(q * phi)
            
            # Puff it out a bit like a tube
            r2 = 2
            x += r2 * math.cos(theta) * math.cos(p * phi)
            y += r2 * math.cos(theta) * math.sin(p * phi)
            z += r2 * math.sin(theta)
            
            vertices.append(f"v {x:.4f} {y:.4f} {z:.4f} 0.500 0.500 0.500")
            
    # Simple quad mesh faces
    faces = []
    for i in range(segments):
        for j in range(loops):
            i1 = i
            i2 = (i + 1) % segments
            j1 = j
            j2 = (j + 1) % loops
            
            v1 = i1 * loops + j1 + 1
            v2 = i2 * loops + j1 + 1
            v3 = i2 * loops + j2 + 1
            v4 = i1 * loops + j2 + 1
            
            faces.append(f"f {v1} {v2} {v3}")
            faces.append(f"f {v1} {v3} {v4}")

    with open(filename, "w") as f:
        f.write("# Generated Bunny alternative OBJ\n")
        f.write("\n".join(vertices) + "\n")
        f.write("\n".join(faces) + "\n")

if __name__ == "__main__":
    import os
    base_path = r"c:\Users\HP\Desktop\Projects\Hackathons\stegano\static\models"
    generate_sphere_obj(os.path.join(base_path, "sphere_small.obj"), sectors=24, stacks=24)
    generate_dummy_bunny_obj(os.path.join(base_path, "bunny_large.obj"), segments=60, loops=30)
    print("Models updated.")
