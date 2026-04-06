from PIL import Image, ImageDraw, ImageFont
import qrcode
import os

QR_FOLDER = "static/qr"

def generate_qr(data: str, filename: str, label: str = "") -> str:
    """
    Generates a QR code image from any string data.
    Saves it to static/qr/<filename>
    Returns the file path.
    """
    os.makedirs(QR_FOLDER, exist_ok=True)
    output_path = os.path.join(QR_FOLDER, filename)

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H, 
        box_size=10,
        border=4
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#0f172a", back_color="white").convert("RGB")

    if label:
        try:
            label_h = 40
            new_img = Image.new("RGB", (img.width, img.height + label_h), "white")
            new_img.paste(img, (0, 0))
            draw = ImageDraw.Draw(new_img)
            font = ImageFont.load_default()
            bbox = draw.textbbox((0, 0), label, font=font)
            text_w = bbox[2] - bbox[0]
            x = (new_img.width - text_w) // 2
            draw.text((x, img.height + 5), label, fill="#0f172a", font=font)
            img = new_img
        except: pass

    img.save(output_path)
    return output_path

def generate_qr_pair(file_url: str, password: str, session_id: str):
    """
    Generates both QR codes for a session.
    Returns (qr1_path, qr2_path)
    """
    qr1 = generate_qr(file_url, f"qr1_{session_id}.png", "QR1 · Public Link")
    qr2 = generate_qr(password, f"qr2_{session_id}.png", "QR2 · Private Key")
    return qr1, qr2
