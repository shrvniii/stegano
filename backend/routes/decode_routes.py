# routes/decode_routes.py

import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from core.obj_parser import parse_obj
from core.steganography import decode_message
from core.crypto import decrypt_message, hash_message, verify_integrity  # FIX: verify_hash → verify_integrity

decode_bp = Blueprint("decode", __name__)

@decode_bp.route("/decode", methods=["POST"])
def decode():
    # --- 1. Get inputs ---
    password = request.form.get("password", "")
    obj_file = request.files.get("obj_file")

    if not password or not obj_file:
        return jsonify({"error": "Password and OBJ file are required."}), 400

    # --- 2. Save uploaded file temporarily ---
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    unique_id = str(uuid.uuid4())[:8]
    input_path = os.path.join(upload_folder, f"decode_{unique_id}.obj")
    obj_file.save(input_path)

    # --- 3. Parse and extract hidden bits ---
    try:
        vertices, _, _ = parse_obj(input_path)
        raw_payload = decode_message(vertices)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    # --- 4. Split message and hash ---
    if "|||HASH:" in raw_payload:
        payload, stored_hash = raw_payload.split("|||HASH:", 1)
    else:
        return jsonify({"error": "Invalid file format — no integrity data found."}), 400

    # --- 5. Try to decrypt if it looks encrypted ---
    try:
        # Attempt decryption — if it fails, treat as plain text
        message = decrypt_message(payload, password)
        was_encrypted = True
    except Exception:
        message = payload
        was_encrypted = False

    # --- 6. Verify integrity (hash check) ---
    # FIX: verify_hash → verify_integrity (correct function name from core/crypto.py)
    integrity_ok = verify_integrity(message, stored_hash)

    return jsonify({
        "success": True,
        "message": message,
        "integrity_ok": integrity_ok,
        "was_encrypted": was_encrypted
    })
