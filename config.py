# config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY    = os.getenv("SECRET_KEY", "dev-key-change-in-production")
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "static/uploads")
    QR_FOLDER     = os.getenv("QR_FOLDER",     "static/qr")
    MODELS_FOLDER = os.getenv("MODELS_FOLDER", "static/models")
    DEBUG         = os.getenv("FLASK_DEBUG", "true").lower() == "true"

    # Max upload size: 50 MB
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024

    # Auto-create all required directories when the class is loaded
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(QR_FOLDER,     exist_ok=True)
    os.makedirs(MODELS_FOLDER, exist_ok=True)
    os.makedirs("static/thumbnails", exist_ok=True)
