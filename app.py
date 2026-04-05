"""
app.py — Minimal Flask server for frontend development.
The real backend is built separately. This serves the Jinja2 templates
and static files so the frontend can be tested standalone.
"""
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# ── Preloaded model data ────────────────────────────────────────
MODELS = [
    {"name": "teapot",       "vertex_count": 222, "capacity_bits": 222 * 3 * 8},
    {"name": "cube",         "vertex_count": 8,   "capacity_bits": 8 * 3 * 8},
    {"name": "icosahedron",  "vertex_count": 12,  "capacity_bits": 12 * 3 * 8},
]

@app.route("/")
def index():
    return render_template("index.html", models=MODELS)

@app.route("/encode", methods=["GET", "POST"])
def encode():
    if request.method == "POST":
        # Stub: in production, the real backend handles this
        return jsonify({
            "success": True,
            "message": "Encoding complete (stub)",
            "redirect": "/result"
        })
    return render_template("encode.html", models=MODELS)

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
        download_url=None,
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
