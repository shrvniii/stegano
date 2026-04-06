"""
routes/model_routes.py
Pari's Task #10 — Preloaded Models Management
Flask routes to list and serve preloaded OBJ files and metadata.
"""

import os
import json
from flask import Blueprint, jsonify, send_from_directory, current_app

model_bp = Blueprint("models", __name__)

# Metadata for each bundled model
PRELOADED_MODELS = [
    {
        "id":       "sphere",
        "name":     "Sphere",
        "filename": "sphere.obj",
        "vertices": 482,
        "capacity": 180,   # characters
        "thumbnail": "sphere.png",
        "description": "A smooth UV sphere — great for small messages.",
    },
    {
        "id":       "teapot",
        "name":     "Utah Teapot",
        "filename": "teapot.obj",
        "vertices": 3644,
        "capacity": 1366,
        "thumbnail": "teapot.png",
        "description": "The classic CG teapot — medium capacity.",
    },
    {
        "id":       "bunny",
        "name":     "Stanford Bunny",
        "filename": "bunny.obj",
        "vertices": 14290,
        "capacity": 5358,
        "thumbnail": "bunny.png",
        "description": "High-vertex bunny — fits long messages easily.",
    },
    {
        "id":       "head",
        "name":     "Low-Poly Head",
        "filename": "head.obj",
        "vertices": 5000,
        "capacity": 1875,
        "thumbnail": "head.png",
        "description": "A stylised low-poly human head.",
    },
]


def _models_dir():
    return os.path.join(current_app.root_path, "models")


def _thumbnails_dir():
    return os.path.join(current_app.root_path, "static", "thumbnails")


@model_bp.route("/api/models", methods=["GET"])
def list_models():
    """Return JSON list of all preloaded models with metadata."""
    models_dir = _models_dir()
    result = []
    for m in PRELOADED_MODELS:
        obj_path = os.path.join(models_dir, m["filename"])
        result.append({
            **m,
            "available": os.path.isfile(obj_path),
            "obj_url":   f"/models/download/{m['filename']}",
            "thumb_url": f"/static/thumbnails/{m['thumbnail']}",
        })
    return jsonify(result)


@model_bp.route("/models/download/<filename>", methods=["GET"])
def download_model(filename):
    """Serve a preloaded OBJ file for download."""
    return send_from_directory(_models_dir(), filename, as_attachment=True)


@model_bp.route("/api/models/<model_id>", methods=["GET"])
def get_model(model_id):
    """Return metadata for a single model by id."""
    for m in PRELOADED_MODELS:
        if m["id"] == model_id:
            obj_path = os.path.join(_models_dir(), m["filename"])
            return jsonify({
                **m,
                "available": os.path.isfile(obj_path),
                "obj_url":   f"/models/download/{m['filename']}",
                "thumb_url": f"/static/thumbnails/{m['thumbnail']}",
            })
    return jsonify({"error": "Model not found"}), 404


@model_bp.route("/api/models/capacity/<model_id>/<int:message_length>", methods=["GET"])
def check_capacity(model_id, message_length):
    """Check whether a model has enough capacity for a given message length."""
    for m in PRELOADED_MODELS:
        if m["id"] == model_id:
            bits_needed   = message_length * 8
            bits_available = m["vertices"] * 3        # 1 bit per RGB channel
            chars_available = bits_available // 8
            percent_used  = round((message_length / chars_available) * 100, 1) if chars_available else 100
            return jsonify({
                "model_id":        model_id,
                "message_length":  message_length,
                "bits_needed":     bits_needed,
                "bits_available":  bits_available,
                "chars_available": chars_available,
                "percent_used":    percent_used,
                "fits":            message_length <= chars_available,
            })
    return jsonify({"error": "Model not found"}), 404
