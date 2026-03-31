from flask import Flask
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

# Explicitly set the keys routes depend on (from Config, sourced from .env)
app.secret_key                 = Config.SECRET_KEY
app.config["UPLOAD_FOLDER"]   = Config.UPLOAD_FOLDER
app.config["QR_FOLDER"]       = Config.QR_FOLDER
app.config["MODELS_FOLDER"]   = Config.MODELS_FOLDER

# Register blueprints
from routes.encode_routes import encode_bp
from routes.decode_routes import decode_bp
from routes.model_routes  import model_bp

app.register_blueprint(encode_bp)
app.register_blueprint(decode_bp)
app.register_blueprint(model_bp)

if __name__ == "__main__":
    app.run(debug=Config.DEBUG)
