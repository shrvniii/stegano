from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import time
from config import Config

# ====================== FLASK APP SETUP ======================
app = Flask(__name__,
            template_folder='templates',   # Shravani's HTML templates
            static_folder='static')        # Shravani's static files (js, css, models)

app.config.from_object(Config)

# Explicitly set important config keys
app.secret_key                 = Config.SECRET_KEY
app.config["UPLOAD_FOLDER"]   = Config.UPLOAD_FOLDER
app.config["QR_FOLDER"]       = Config.QR_FOLDER
app.config["MODELS_FOLDER"]   = Config.MODELS_FOLDER

# Create necessary directories
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs(app.config["QR_FOLDER"], exist_ok=True)
os.makedirs(os.path.join(app.static_folder, "encoded_output"), exist_ok=True)

# ====================== BACKEND IMPORTS (Updated for backend/ folder) ======================
from backend.core.crypto import *
from backend.core.steganography import *
from backend.core.obj_parser import *
from backend.core.qr_generator import *
from backend.routes.encode_routes import encode_bp
from backend.routes.decode_routes import decode_bp
from backend.routes.model_routes import model_bp

# Register blueprints (your real backend routes)
app.register_blueprint(encode_bp)
app.register_blueprint(decode_bp)
app.register_blueprint(model_bp)

# ====================== SHRAVANI'S HELPER ROUTES (Frontend Support) ======================
# These help the frontend work smoothly (models list, download, etc.)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/models")
def models():
    # You can enhance this later with real model data from your backend
    return render_template("models.html")

@app.route("/download/<filename>")
def download_file(filename):
    """Serve encoded OBJ files"""
    encoded_dir = os.path.join(app.static_folder, "encoded_output")
    return send_from_directory(encoded_dir, filename, as_attachment=True)

# ====================== MAIN ======================
if __name__ == "__main__":
    print("🚀 3D Steganography Vault is running...")
    print("Backend + Frontend integrated successfully!")
    app.run(debug=Config.DEBUG, port=5000)