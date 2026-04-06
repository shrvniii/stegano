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
        # Rebuild the vertex line with updated color values
        lines[line_num] = f"v {v[0]} {v[1]} {v[2]} {v[3]} {v[4]} {v[5]}\n"

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
    Returns max characters that can be hidden in this OBJ file.
    Formula: vertices × 3 color channels × 1 bit ÷ 8 bits per char
    """
    vertex_count = get_vertex_count(filepath)
    return (vertex_count * 3) // 8
