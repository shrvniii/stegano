"""
app.py — Minimal Flask server for frontend development.
The real backend is built separately. This serves the Jinja2 templates
and static files so the frontend can be tested standalone.
"""
import os, time
from flask import Flask, render_template, request, jsonify, send_from_directory

app = Flask(__name__)

# Directory for encoded output files
ENCODED_DIR = os.path.join(app.static_folder, "encoded_output")
os.makedirs(ENCODED_DIR, exist_ok=True)

# ── Preloaded model data ────────────────────────────────────────
# TeapotGeometry(1.5, 15) produces ~3000+ vertices
MODELS = [
    {"name": "teapot",       "vertex_count": 3178, "capacity_bits": 3178 * 3 * 8},
    {"name": "cube",         "vertex_count": 8,    "capacity_bits": 8 * 3 * 8},
    {"name": "icosahedron",  "vertex_count": 12,   "capacity_bits": 12 * 3 * 8},
]

@app.route("/")
def index():
    return render_template("index.html", models=MODELS)

@app.route("/encode", methods=["GET", "POST"])
def encode():
    if request.method == "POST":
        # Stub: save a dummy encoded file for download demonstration
        timestamp = int(time.time())
        filename = f"encoded_{timestamp}.obj"
        filepath = os.path.join(ENCODED_DIR, filename)

        # In production, the real backend does LSB encoding here.
        # For now, copy the source model or write a stub.
        model_name = request.form.get("model", "teapot")
        source = os.path.join(app.static_folder, "models", f"{model_name}.obj")
        if os.path.exists(source):
            import shutil
            shutil.copy2(source, filepath)
        else:
            with open(filepath, "w") as f:
                f.write("# Stub encoded OBJ\nv 0 0 0\n")

        return jsonify({
            "success": True,
            "message": "Encoding complete",
            "download_url": f"/download/{filename}",
            "redirect": "/result",
        })
    return render_template("encode.html", models=MODELS)

@app.route("/download/<filename>")
def download_file(filename):
    """Serve encoded OBJ files for download."""
    return send_from_directory(ENCODED_DIR, filename, as_attachment=True)

@app.route("/models")
def models():
    return render_template("models.html", models=MODELS)

@app.route("/result")
def result():
    # Stub data for demo
    stats = {
        "bits_used": 1136,
        "vertices_modified": 48,
        "capacity_percent": 21,
        "encrypted": True,
    }
    return render_template(
        "result.html",
        stats=stats,
        qr1_path=None,
        qr2_path=None,
        download_url="/download/encoded_demo.obj",
        original_obj_url="/static/models/teapot.obj",
        encoded_obj_url="/static/models/teapot.obj",
    )

@app.route("/decode", methods=["GET", "POST"])
def decode():
    if request.method == "POST":
        # Stub: in production, the real backend handles this
        return jsonify({
            "message": "This is a decoded secret message! 🎉",
            "integrity_ok": True,
        })
    return render_template("decode.html")

if __name__ == "__main__":
    app.run(debug=True, port=5000)
