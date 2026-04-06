from flask import Flask, render_template, request, jsonify, send_from_directory
import os
from config import Config

# ✅ Imports:
from routes.encode_routes import encode_bp
from routes.decode_routes import decode_bp
from routes.model_routes import model_bp

# ✅ Flask setup:
app = Flask(__name__, template_folder="templates", static_folder="static")
app.config.from_object(Config)

# Register blueprints (your real backend routes)
# ✅ Register routes:
app.register_blueprint(encode_bp)
app.register_blueprint(decode_bp)
app.register_blueprint(model_bp)

from core.obj_parser import get_models_list

@app.route("/")
def index():
    folder = app.config.get("MODELS_FOLDER", "static/models")
    return render_template("index.html", models=get_models_list(folder))

@app.route("/models")
@app.route("/models_view")
def models_view():
    folder = app.config.get("MODELS_FOLDER", "static/models")
    return render_template("models.html", models=get_models_list(folder))

@app.route("/download/<filename>")
def download_file(filename):
    """Serve encoded OBJ files"""
    encoded_dir = os.path.join(app.static_folder, "encoded_output")
    return send_from_directory(encoded_dir, filename, as_attachment=True)

if __name__ == "__main__":
    # Ensure directories exist
    os.makedirs(os.path.join(app.static_folder, "encoded_output"), exist_ok=True)
    os.makedirs(os.path.join(app.static_folder, "qr"), exist_ok=True)
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    
    print("🚀 3D Steganography Vault is running...")
    app.run(debug=Config.DEBUG, port=5000)