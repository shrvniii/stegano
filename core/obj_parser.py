def parse_obj(filepath):
    """
    Reads a .OBJ file and returns:
    - vertices: list of vertex data (each is a list of floats: x,y,z,r,g,b)
    - lines: all raw lines of the file (to preserve everything else like faces)
    - vertex_line_indices: which line numbers in 'lines' are vertex lines
    """
    vertices = []
    lines = []
    vertex_line_indices = []

    with open(filepath, "r") as f:
        for i, line in enumerate(f):
            lines.append(line)
            if line.startswith("v "):
                parts = line.strip().split()
                vertex = [float(p) for p in parts[1:]]
                # If no color data, add default white (1.0, 1.0, 1.0)
                if len(vertex) == 3:
                    vertex += [1.0, 1.0, 1.0]
                vertices.append(vertex)
                vertex_line_indices.append(i)

    return vertices, lines, vertex_line_indices


def write_obj(filepath, vertices, lines, vertex_line_indices):
    """
    Writes a modified OBJ file back to disk.
    Takes the modified vertices and puts them back into the original lines.
    """
    for idx, line_num in enumerate(vertex_line_indices):
        v = vertices[idx]
        # Rebuild the vertex line with high-precision (8 decimal places) to preserve LSB data
        lines[line_num] = f"v {v[0]:.8f} {v[1]:.8f} {v[2]:.8f} {v[3]:.8f} {v[4]:.8f} {v[5]:.8f}\n"

    with open(filepath, "w") as f:
        f.writelines(lines)


def get_vertex_count(filepath):
    """
    Quickly counts how many vertices a .OBJ file has.
    Used by the Smart Model Selector to check capacity.
    """
    count = 0
    with open(filepath, "r") as f:
        for line in f:
            if line.startswith("v "):
                count += 1
    return count


def get_capacity(filepath):
    """
    Returns max bits that can be hidden in this OBJ file.
    Formula: vertices × 3 color channels (R,G,B) × 1 bit
    """
    vertex_count = get_vertex_count(filepath)
    return vertex_count * 3
import os
import urllib.parse

def get_models_list(folder):
    """
    Returns a list of all models in the folder with metadata.
    """
    import os
    if not os.path.exists(folder):
        return []

    models = []
    DESCRIPTIONS = {
        "sphere.obj": "A smooth UV sphere — great for small messages.",
        "teapot.obj": "The classic CG teapot — medium capacity.",
        "bunny.obj": "High-vertex bunny — fits long messages easily.",
        "dragon.obj": "Full-body dragon — ultimate capacity for huge data sets.",
        "head.obj": "A stylised low-poly human head.",
        "cube.obj": "A simple box — minimal capacity, legacy use-cases."
    }

    for filename in sorted(os.listdir(folder)):
        if not filename.endswith(".obj"):
            continue

        filepath     = os.path.join(folder, filename)
        vertex_count = get_vertex_count(filepath)
        capacity     = get_capacity(filepath)
        
        # Create a URL-safe name for frontend IDs/datasets
        slug = filename.replace(".obj", "").replace(" ", "_").lower()

        models.append({
            "filename":      filename,
            "slug":          slug,
            "name":          filename.replace(".obj", "").replace("_", " ").title(),
            "vertex_count":  vertex_count,
            "capacity_bits": capacity, 
            "capacity_chars": capacity,
            "description":    DESCRIPTIONS.get(filename, "A 3D mesh ready for secure data encoding."),
            "obj_url":       f"/static/models/{urllib.parse.quote(filename)}",
            "thumbnail_url": f"/static/models/thumbnails/{urllib.parse.quote(filename.replace('.obj', '.png'))}",
        })
    return models
