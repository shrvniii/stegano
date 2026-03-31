# core/qr_generator.py

import qrcode
import os

QR_FOLDER = "static/qr"


def generate_qr(data: str, filename: str) -> str:
    """
    Generates a QR code image from any string data.
    Saves it to static/qr/<filename>.png
    Returns the file path.
    """
    os.makedirs(QR_FOLDER, exist_ok=True)
    output_path = os.path.join(QR_FOLDER, filename)

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    img.save(output_path)

    return output_path


def generate_qr_pair(file_url: str, password: str, session_id: str):
    """
    Generates both QR codes for a session.
    QR1 → download link for the encoded OBJ
    QR2 → the password key
    Returns (qr1_path, qr2_path)
    """
    qr1_path = generate_qr(file_url, f"qr1_{session_id}.png")
    qr2_path = generate_qr(password, f"qr2_{session_id}.png")
    return qr1_path, qr2_path
