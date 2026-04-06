# routes/encode_routes.py

import os
import uuid
from flask import Blueprint, request, jsonify, current_app, render_template, session
from core.obj_parser import parse_obj, write_obj, get_capacity, get_models_list
from core.steganography import encode_message
from core.crypto import encrypt_message, hash_message
from core.qr_generator import generate_qr_pair

encode_bp = Blueprint("encode", __name__)

@encode_bp.route("/encode", methods=["GET"])
def encode_page():
    """Renders Shravani's HTML encoder page."""
    folder = current_app.config.get("MODELS_FOLDER", "static/models")
    return render_template("encode.html", models=get_models_list(folder))

@encode_bp.route("/result", methods=["GET"])
def result_page():
    """Renders Shravani's HTML result page using data from the session."""
    result = session.get("result")
    if not result:
        from flask import redirect, url_for
        return redirect(url_for("encode.encode_page"))

    return render_template("result.html", result=result)

@encode_bp.route("/encode", methods=["POST"])
def encode():
    """
    POST /encode — The main backend logic for hiding secrets.
    Handles: message, password, use_encryption, decoy_message,
    and either model_name (preloaded) or obj_file (uploaded).
    """
    # --- 1. Get inputs from the frontend ---
    message = request.form.get("message", "")
    password = request.form.get("password", "")
    use_encryption = request.form.get("use_encryption", "false") == "true"
    decoy_message = request.form.get("decoy_message", "")
    model_name = request.form.get("model_name")
    obj_file = request.files.get("obj_file")

    # --- 2. Validation: We need a message, a password, and a model ---
    if not message or not password:
        return jsonify({"success": False, "error": "Message and password/key are required."}), 400
    if not model_name and not obj_file:
        return jsonify({"success": False, "error": "Please select a model or upload an OBJ file."}), 400

    # --- 3. Step 1: Get model path ---
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    unique_id = str(uuid.uuid4())[:8]
    input_path = ""

    if obj_file:
        # Use CUSTOM uploaded file
        input_path = os.path.join(upload_folder, f"upload_{unique_id}.obj")
        obj_file.save(input_path)
    else:
        # Use PRELOADED model from static/models/
        models_dir = os.path.join(current_app.static_folder, "models")
        input_path = os.path.join(models_dir, f"{model_name}.obj")
        if not os.path.exists(input_path):
            return jsonify({"success": False, "error": f"Model {model_name} not found."}), 404

    # --- 4. Step 2 & 3: Parse OBJ and Prepare Message ---
    try:
        vertices, lines, vertex_line_indices = parse_obj(input_path)
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to parse OBJ: {str(e)}"}), 500

    # Step 3: Prepare message (optionally encrypt)
    payload = message
    if use_encryption:
        # If encrypted, we can optionally pack the decoy - but for simplicity we hide the real one.
        # Professional steganography might hide both, but here we prioritize the secret.
        payload = encrypt_message(message, password)

    # Step Check: Integrity Hash (for Reveal page to verify)
    message_hash = hash_message(message)
    full_payload = f"{payload}|||HASH:{message_hash}"

    # --- 5. Step 4, 5 & 6: Encode and Save output ---
    try:
        # encode_message converts string to bits internally
        modified_vertices = encode_message(vertices, full_payload)
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

    # Step 6: Save new OBJ
    encoded_folder = os.path.join(current_app.static_folder, "encoded_output")
    os.makedirs(encoded_folder, exist_ok=True)
    output_filename = f"encoded_{unique_id}.obj"
    output_path = os.path.join(encoded_folder, output_filename)
    
    write_obj(output_path, modified_vertices, lines, vertex_line_indices)

    # --- 6. Step 7: Final Preparation (QR codes + Stats) ---
    # File download URL (absolute needed for QR codes)
    host_url = request.url_root.rstrip("/") # e.g. http://127.0.0.1:5000
    file_url = f"{host_url}/download/{output_filename}"
    
    qr1_path, qr2_path = generate_qr_pair(file_url, password, unique_id)

    # --- 7. Save to session for the result page ---
    session["result"] = {
        "output_file":    output_filename,
        "file_url":       file_url,
        "qr_file":        f"/static/qr/{os.path.basename(qr1_path)}",
        "qr_key":         f"/static/qr/{os.path.basename(qr2_path)}",
        "password":       password,
        "original_obj_url": f"/static/models/{model_name}.obj" if not obj_file else f"/static/uploads/{os.path.basename(input_path)}",
        "encoded_obj_url":  f"/static/encoded_output/{output_filename}",
        "stats": {
            "message_length":    len(message),
            "vertices_modified": (len(full_payload) * 8 + 2) // 3,
            "bits_used":         (len(full_payload) * 8),
            "capacity_percent":   round(((len(full_payload) * 8) / (len(vertices) * 3)) * 100, 1) if len(vertices) > 0 else 0,
            "encrypted":         use_encryption
        }
    }

    # --- 8. Return JSON response for Task 1 redirect ---
    return jsonify({
        "success": True,
        "output_file": output_filename,
        "qr1_url": f"/static/qr/{os.path.basename(qr1_path)}",
        "qr2_url": f"/static/qr/{os.path.basename(qr2_path)}"
    })
