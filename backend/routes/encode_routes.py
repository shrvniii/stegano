# routes/encode_routes.py

import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from core.obj_parser import parse_obj, write_obj, get_capacity
from core.steganography import encode_message
from core.crypto import encrypt_message, hash_message
from core.qr_generator import generate_qr_pair

encode_bp = Blueprint("encode", __name__)

@encode_bp.route("/encode", methods=["POST"])
def encode():
    # --- 1. Get inputs from the frontend ---
    message = request.form.get("message", "")
    password = request.form.get("password", "")
    use_encryption = request.form.get("use_encryption", "false") == "true"
    obj_file = request.files.get("obj_file")

    # --- 2. Basic validation ---
    if not message or not password or not obj_file:
        return jsonify({"error": "Message, password, and OBJ file are required."}), 400

    # --- 3. Save uploaded OBJ temporarily ---
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    unique_id = str(uuid.uuid4())[:8]
    input_filename = f"input_{unique_id}.obj"
    output_filename = f"encoded_{unique_id}.obj"
    input_path = os.path.join(upload_folder, input_filename)
    output_path = os.path.join(upload_folder, output_filename)
    obj_file.save(input_path)

    # --- 4. Check capacity before doing anything ---
    capacity = get_capacity(input_path)
    if len(message) > capacity:
        return jsonify({
            "error": f"Message too long. Model capacity: {capacity} chars, your message: {len(message)} chars."
        }), 400

    # --- 5. Optionally encrypt the message ---
    payload = message
    if use_encryption:
        payload = encrypt_message(message, password)

    # --- 6. Hash the message for integrity check later ---
    message_hash = hash_message(message)
    # Store hash alongside message separated by a special marker
    full_payload = f"{payload}|||HASH:{message_hash}"

    # --- 7. Parse OBJ, encode, write output ---
    vertices, lines, vertex_line_indices = parse_obj(input_path)
    modified_vertices = encode_message(vertices, full_payload)
    write_obj(output_path, modified_vertices, lines, vertex_line_indices)

    # --- 8. Generate QR codes ---
    # FIX: generate_qr_pair(file_url, password, session_id) — only 3 args
    file_url = f"http://127.0.0.1:5000/download/{output_filename}"
    qr1_path, qr2_path = generate_qr_pair(file_url, password, unique_id)

    # --- 9. Return result to frontend ---
    bits_used = len(full_payload) * 8
    total_bits = len(vertices) * 3
    vertices_modified = (bits_used + 2) // 3  # each vertex holds 3 bits
    capacity_pct = round((bits_used / total_bits) * 100, 1) if total_bits > 0 else 0

    return jsonify({
        "success": True,
        "encoded_file": output_filename,
        "qr1_url": f"/static/qr/{os.path.basename(qr1_path)}",
        "qr2_url": f"/static/qr/{os.path.basename(qr2_path)}",
        "stats": {
            "message_length": len(message),
            "bits_used": bits_used,
            "vertices_modified": vertices_modified,
            "capacity_chars": capacity,
            "capacity_pct": capacity_pct,
            "encrypted": use_encryption
        }
    })
