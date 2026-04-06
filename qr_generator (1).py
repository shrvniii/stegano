"""
core/qr_generator.py
Pari's Task #1 — QR Code Generator (Python)
Generates QR1 (encoded OBJ file URL) and QR2 (password key)
"""

import qrcode
import os
from PIL import Image, ImageDraw, ImageFont


def generate_qr(data: str, output_path: str, label: str = "") -> str:
    """
    Generate a QR code image and save it to output_path.
    Returns the output_path on success.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#0f172a", back_color="white")
    img = img.convert("RGB")

    # Add label below QR if provided
    if label:
        try:
            label_height = 36
            new_img = Image.new("RGB", (img.width, img.height + label_height), "white")
            new_img.paste(img, (0, 0))
            draw = ImageDraw.Draw(new_img)
            # Try to use a basic font, fallback to default
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
            except Exception:
                font = ImageFont.load_default()
            bbox = draw.textbbox((0, 0), label, font=font)
            text_w = bbox[2] - bbox[0]
            x = (new_img.width - text_w) // 2
            draw.text((x, img.height + 6), label, fill="#0f172a", font=font)
            img = new_img
        except Exception:
            pass  # label is optional, skip if it fails

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)
    return output_path


def generate_qr_pair(file_url: str, password: str, output_dir: str) -> dict:
    """
    Generate both QR codes for the steganography result.

    Args:
        file_url:   Full URL to download the encoded OBJ file (QR1)
        password:   The encryption/encoding password key (QR2)
        output_dir: Directory where QR PNG images will be saved

    Returns:
        dict with keys 'qr1_path' and 'qr2_path'
    """
    os.makedirs(output_dir, exist_ok=True)

    qr1_path = os.path.join(output_dir, "qr1_file.png")
    qr2_path = os.path.join(output_dir, "qr2_key.png")

    generate_qr(file_url, qr1_path, label="QR1 · Encoded File")
    generate_qr(password,  qr2_path, label="QR2 · Secret Key")

    return {
        "qr1_path": qr1_path,
        "qr2_path": qr2_path,
    }


def get_qr_base64(image_path: str) -> str:
    """Convert a QR PNG to base64 string for inline HTML embedding."""
    import base64
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")
