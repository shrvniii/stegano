# routes/model_routes.py

import os
from flask import Blueprint, jsonify, send_from_directory, current_app
from core.obj_parser import get_vertex_count, get_capacity

model_bp = Blueprint("models", __name__)


@model_bp.route("/models", methods=["GET"])
def list_models():
    """
    Returns metadata for all preloaded OBJ models.
    Used by the Smart Model Selector — provides vertex count,
    character capacity, thumbnail URL, and OBJ download URL.
    """
    # Read folder from app config (sourced from .env via config.py)
    folder = current_app.config.get("MODELS_FOLDER", "static/models")

    if not os.path.exists(folder):
        return jsonify([])

    models = []
    for filename in sorted(os.listdir(folder)):
        if not filename.endswith(".obj"):
            continue

        filepath     = os.path.join(folder, filename)
        vertex_count = get_vertex_count(filepath)
        capacity     = get_capacity(filepath)  # (vertices * 3) // 8

        models.append({
            "filename":      filename,
            "name":          filename.replace(".obj", "").replace("_", " ").title(),
            "vertex_count":  vertex_count,
            "capacity_chars": capacity,
            # URL for Three.js OBJLoader to fetch the raw file
            "obj_url":       f"/static/models/{filename}",
            # Thumbnail must match: static/thumbnails/<name>.png
            "thumbnail_url": f"/static/thumbnails/{filename.replace('.obj', '.png')}",
        })

    return jsonify(models)


@model_bp.route("/download/<filename>")
def download_file(filename):
    """Serves encoded OBJ files as a download attachment."""
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    return send_from_directory(upload_folder, filename, as_attachment=True)
