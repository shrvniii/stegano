# routes/model_routes.py

import os
from flask import Blueprint, jsonify, send_from_directory, current_app
from core.obj_parser import get_models_list

model_bp = Blueprint("models", __name__)

@model_bp.route("/api/models", methods=["GET"])
def list_models():
    """
    Returns metadata for all preloaded OBJ models.
    """
    folder = current_app.config.get("MODELS_FOLDER", "static/models")
    return jsonify(get_models_list(folder))
